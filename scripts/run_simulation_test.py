"""Container Yard Simulation Test - Full workflow verification."""
import json
import os
import re
import sqlite3
import sys
import time
from pathlib import Path
from typing import List, Dict, Any
import logging

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "Yard-Optimization" / "backend"))

from Modules.database.chroma_client import chroma_client
from Modules.database.neo4j_client import neo4j_client
from Modules.rag.retrieval_chain import HybridRetrievalChain
from Modules.llm.llm_client import get_default_llm

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def _get_sqlite_connection() -> sqlite3.Connection:
    """Get a read-only SQLite connection to yard_optimization.db (with v2 tables)."""
    candidates = [
        os.environ.get("SQLITE_DB_PATH", ""),
        "/app/backend/yard_optimization.db",                                    # Docker
        str(Path(__file__).parent.parent / "Yard-Optimization" / "backend" / "yard_optimization.db"),  # Local
        "/app/data/sqlite/yard_optimization.db",                                # Docker fallback
        str(Path(__file__).parent.parent / "data" / "sqlite" / "yard_optimization.db"),               # Local fallback
    ]
    db_path = None
    for path in candidates:
        if path and Path(path).exists():
            # Verify the DB actually contains the v2 tables we need
            try:
                test_conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
                test_conn.execute("SELECT 1 FROM containers_v2 LIMIT 1")
                test_conn.close()
                db_path = path
                break
            except sqlite3.OperationalError:
                logger.warning(f"Skipping {path} — missing containers_v2 table")
                continue
    if not db_path:
        raise FileNotFoundError(
            "No SQLite database with containers_v2 table found. Checked: " + ", ".join(c for c in candidates if c)
        )
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    logger.info(f"Connected to SQLite database at {db_path}")
    return conn


def load_containers_from_sqlite(limit: int = 50, offset: int = 0) -> List[Dict]:
    """Load container data from SQLite containers_v2 table.

    Returns rows as dicts with human-readable keys matching what the rest
    of the simulation code expects (e.g. 'Container ID', 'POD', etc.).
    """
    conn = _get_sqlite_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM containers_v2 ORDER BY container_id LIMIT ? OFFSET ?",
            (limit, offset)
        )
        rows = [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

    def _s(val):
        """Coerce None to empty string."""
        return val if val is not None else ""

    mapped = []
    for row in rows:
        mapped.append({
            "Container ID": _s(row.get("container_id")),
            "Container Number": _s(row.get("container_number")),
            "Container Type": _s(row.get("container_type")),
            "POD": _s(row.get("pod")),
            "Weight Class": _s(row.get("weight_class")),
            "Block ID": _s(row.get("block_id")),
            "To Location ID": _s(row.get("to_location_id")),
            "Event Type": _s(row.get("event_type")),
            "Movement Type": _s(row.get("movement_type")),
            "Reason for Movement": _s(row.get("reason_for_movement")),
            "Optimality Tag": _s(row.get("optimality_tag")),
        })
    logger.info(f"Loaded {len(mapped)} containers from SQLite (offset={offset})")
    return mapped


def load_blocks_to_chromadb():
    """Load blocks_v2 data from SQLite into ChromaDB 'yard_layout' collection."""
    logger.info("Loading yard layout (blocks) from SQLite to ChromaDB...")

    conn = _get_sqlite_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM blocks_v2")
        blocks = [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

    if not blocks:
        logger.warning("No blocks found in SQLite blocks_v2 table")
        return

    collection = chroma_client.get_or_create_collection(
        "yard_layout",
        metadata={"description": "Yard block layout and capacity information"}
    )

    documents = []
    metadatas = []
    ids = []

    for block in blocks:
        block_id = block.get("block_id", "")
        description = (
            f"Block {block_id}: {block.get('block_type', '')} block in {block.get('yard_name', '')}\n"
            f"Capacity: {block.get('total_slots', 0)} slots "
            f"({block.get('bays', 0)} bays x {block.get('rows', 0)} rows x {block.get('max_tier', 0)} tiers)\n"
            f"Occupied: {block.get('occupied_slots', 0)} slots\n"
            f"Reefer plugs: {block.get('reefer_plugs', 0)}\n"
            f"Hazmat certified: {'Yes' if block.get('hazmat_certified') else 'No'}\n"
            f"Primary use: {block.get('primary_use', '')}"
        )
        documents.append(description)
        metadatas.append({
            "block_id": block_id,
            "yard_name": str(block.get("yard_name", "")),
            "block_type": str(block.get("block_type", "")),
            "total_slots": str(block.get("total_slots", 0)),
            "occupied_slots": str(block.get("occupied_slots", 0)),
            "reefer_plugs": str(block.get("reefer_plugs", 0)),
            "hazmat_certified": str(block.get("hazmat_certified", 0)),
            "data_type": "yard_layout"
        })
        ids.append(f"block-{block_id}")

    collection.add(documents=documents, metadatas=metadatas, ids=ids)
    logger.info(f"Loaded {len(blocks)} blocks into ChromaDB 'yard_layout' collection")


def load_rules_to_chromadb():
    """Ensure rules are loaded to ChromaDB (if not already loaded)."""
    logger.info("Checking if rules are in ChromaDB...")
    
    rules_collection = chroma_client.get_or_create_collection(
        "yard_rules",
        metadata={"description": "Yard stacking rules and constraints"}
    )
    count = rules_collection.count()
    
    if count == 0:
        logger.warning("⚠️  No rules found in ChromaDB. Please run ingest_rules.py first.")
        logger.info("   Rules should be loaded before running simulation.")
    else:
        logger.info(f"✅ Found {count} rules in ChromaDB")


def load_training_data_to_chromadb(training_rows: List[Dict]):
    """Load first 30 rows as training data to ChromaDB."""
    logger.info(f"Loading {len(training_rows)} training rows to ChromaDB...")
    
    collection = chroma_client.get_or_create_collection(
        "historical_patterns",
        metadata={"description": "Historical container movement patterns"}
    )
    
    documents = []
    metadatas = []
    ids = []
    
    for idx, row in enumerate(training_rows):
        # Create a descriptive text for embedding
        container_id = row.get("Container ID", f"TRAIN-{idx}")
        container_type = row.get("Container Type", "")
        pod = row.get("POD", "")
        weight_class = row.get("Weight Class", "")
        to_location = row.get("To Location ID", "")
        block_id = row.get("Block ID", "")
        
        description = f"""
        Container {container_id}: {container_type} container, {weight_class} weight
        POD: {pod}
        Placed at: {to_location} (Block: {block_id})
        Event: {row.get('Event Type', '')}
        Movement: {row.get('Movement Type', '')}
        Reason: {row.get('Reason for Movement', '')}
        Optimality: {row.get('Optimality Tag', '')}
        """.strip()
        
        documents.append(description)
        metadatas.append({
            "container_id": container_id or "",
            "container_type": container_type or "",
            "pod": pod or "",
            "weight_class": weight_class or "",
            "block_id": block_id or "",
            "to_location": to_location or "",
            "event_type": row.get("Event Type", "") or "",
            "data_type": "training"
        })
        ids.append(f"train-{idx}")
    
    collection.add(documents=documents, metadatas=metadatas, ids=ids)
    logger.info(f"✅ Loaded {len(training_rows)} training rows to ChromaDB")


def query_chromadb_for_recommendation(container_data: Dict) -> Dict[str, Any]:
    """Query ChromaDB for relevant rules and training data."""
    logger.info("Querying ChromaDB for context...")
    
    # Query rules collection (with proper metadata)
    rules_collection = chroma_client.get_or_create_collection(
        "yard_rules",
        metadata={"description": "Yard stacking rules and constraints"}
    )
    container_type = container_data.get("Container Type", "")
    pod = container_data.get("POD", "")
    
    # Search for relevant rules
    rules_query = f"container type {container_type} POD {pod} stacking rules"
    rules_results = rules_collection.query(
        query_texts=[rules_query],
        n_results=10
    )
    
    # Query historical patterns (with proper metadata)
    patterns_collection = chroma_client.get_or_create_collection(
        "historical_patterns",
        metadata={"description": "Historical container movement patterns"}
    )
    patterns_query = f"container {container_type} {pod} placement pattern"
    patterns_results = patterns_collection.query(
        query_texts=[patterns_query],
        n_results=15
    )
    
    return {
        "rules": rules_results,
        "patterns": patterns_results
    }


def query_neo4j_yard_state() -> Dict[str, Any]:
    """Query Neo4j for current yard state."""
    logger.info("Querying Neo4j for yard state...")
    
    query = """
    MATCH (s:Slot)
    OPTIONAL MATCH (s)<-[:LOCATED_AT]-(c:Container)
    WITH s, collect(c) as containers
    RETURN s.zoneType as zone,
           s.yardName as yard_name,
           s.blockId as block_id,
           s.slotId as slot_id,
           s.isOccupied as is_occupied,
           count(containers) as container_count
    ORDER BY s.yardName, s.blockId
    LIMIT 100
    """
    
    results = neo4j_client.execute_query(query)
    return {"yard_state": results}


def query_neo4j_stack_at_slot(block_id: str, bay: int, row: int) -> List[Dict[str, Any]]:
    """Query Neo4j for all containers in the same stack (block, bay, row) ordered by tier."""
    logger.info(f"Querying Neo4j for stack at {block_id} bay={bay} row={row}...")

    query = """
    MATCH (c:Container)-[:LOCATED_AT]->(s:Slot)
    WHERE s.blockId = $block_id
      AND s.bay = $bay
      AND s.row = $row
    OPTIONAL MATCH (c)-[:ASSIGNED_TO]->(v:Vessel)
    RETURN c.containerId AS container_id,
           c.containerNumber AS container_number,
           c.containerType AS container_type,
           c.weightClass AS weight_class,
           c.pod AS pod,
           s.tier AS tier,
           v.cutoffDatetime AS vessel_cutoff,
           v.vesselId AS vessel_id
    ORDER BY s.tier ASC
    """

    try:
        results = neo4j_client.execute_query(query, {
            "block_id": block_id,
            "bay": bay,
            "row": row
        })
        logger.info(f"   Found {len(results)} containers in stack")
        return results
    except Exception as e:
        logger.warning(f"   Could not query stack: {e}")
        return []


def get_llm_recommendation(container_data: Dict, chromadb_context: Dict, neo4j_state: Dict) -> Dict[str, Any]:
    """Get LLM recommendation for container placement."""
    logger.info("Getting LLM recommendation...")
    
    try:
        llm = get_default_llm()
        if not llm:
            logger.warning("LLM not available, returning mock recommendation")
            return {
                "recommended_block": "SS4-B5",
                "recommended_slot": "SS4-B5-17-03-1",
                "reasoning": "Mock recommendation (LLM not available)",
                "score": 0.8
            }
        
        # Build context prompt
        container_type = container_data.get("Container Type", "")
        pod = container_data.get("POD", "")
        weight_class = container_data.get("Weight Class", "")
        
        # Extract rules from ChromaDB results
        rules_text = ""
        if chromadb_context.get("rules") and chromadb_context["rules"].get("documents"):
            rules_text = "\n".join(chromadb_context["rules"]["documents"][0][:5])
        
        # Extract patterns from ChromaDB results
        patterns_text = ""
        if chromadb_context.get("patterns") and chromadb_context["patterns"].get("documents"):
            patterns_text = "\n".join(chromadb_context["patterns"]["documents"][0][:5])
        
        # Extract yard state
        yard_state_text = ""
        if neo4j_state.get("yard_state"):
            available_slots = [s for s in neo4j_state["yard_state"] if not s.get("is_occupied")]
            yard_state_text = f"Available slots: {len(available_slots)}"
        
        prompt = f"""
        You are a container yard optimization expert. Recommend the best placement for this container:
        
        Container Details:
        - Type: {container_type}
        - POD: {pod}
        - Weight Class: {weight_class}
        
        Relevant Rules:
        {rules_text}
        
        Historical Patterns:
        {patterns_text}
        
        Current Yard State:
        {yard_state_text}
        
        Provide a recommendation with:
        1. Recommended block ID
        2. Recommended slot ID (format: BLOCK-BAY-ROW-TIER)
        3. Reasoning for the placement
        4. Confidence score (0-1)
        
        Respond in JSON format.
        """
        
        response = llm.generate(prompt)
        # Parse the LLM JSON response to extract actual recommendation
        recommendation = _parse_llm_response(response)
        return recommendation

    except Exception as e:
        logger.error(f"Error getting LLM recommendation: {e}")
        return {
            "recommended_block": "FALLBACK-B1",
            "recommended_slot": "FALLBACK-B1-01-01-1",
            "reasoning": f"Fallback recommendation (error: {str(e)})",
            "score": 0.5
        }


def _parse_llm_response(response: str) -> Dict[str, Any]:
    """Parse LLM response to extract block, slot, reasoning, and score."""
    # Try to extract JSON from response (may be wrapped in ```json ... ```)
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', response)
    json_str = json_match.group(1).strip() if json_match else response.strip()

    try:
        parsed = json.loads(json_str)
        block = parsed.get("recommended_block", "")
        slot = parsed.get("recommended_slot", "")
        reasoning = parsed.get("reasoning", response)
        score = float(parsed.get("confidence_score", parsed.get("score", 0.8)))

        if block and slot:
            return {
                "recommended_block": block,
                "recommended_slot": slot,
                "reasoning": reasoning,
                "score": score
            }
    except (json.JSONDecodeError, ValueError):
        logger.warning("Could not parse LLM JSON, extracting fields with regex")

    # Regex fallback: extract block and slot patterns like SS2-B1 and SS2-B1-02-03-2
    slot_match = re.search(r'(SS\d+-B\d+-\d+-\d+-\d+)', response)
    block_match = re.search(r'(SS\d+-B\d+)', response)

    return {
        "recommended_block": block_match.group(1) if block_match else "PARSE-ERR-B1",
        "recommended_slot": slot_match.group(1) if slot_match else "PARSE-ERR-B1-01-01-1",
        "reasoning": response,
        "score": 0.75
    }


def get_rehandle_prediction(
    container_data: Dict,
    recommendation: Dict,
    stack_containers: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Get LLM prediction for rehandles at the recommended slot."""
    logger.info("Getting rehandle prediction...")

    # If stack is empty, no rehandles needed
    if not stack_containers:
        logger.info("   Stack is empty, no rehandles needed")
        return {
            "count": 0,
            "affected_containers": [],
            "reasoning": "Stack is empty; no rehandles needed."
        }

    try:
        llm = get_default_llm()
        if not llm:
            return {
                "count": 0,
                "affected_containers": [],
                "reasoning": "LLM not available for rehandle prediction."
            }

        # Build stack description
        stack_desc = ""
        for sc in stack_containers:
            stack_desc += (
                f"  - Tier {sc.get('tier')}: Container {sc.get('container_id')}, "
                f"type={sc.get('container_type')}, weight={sc.get('weight_class')}, "
                f"POD={sc.get('pod')}, vessel_cutoff={sc.get('vessel_cutoff', 'unknown')}\n"
            )

        incoming_pod = container_data.get("POD", "")
        incoming_type = container_data.get("Container Type", "")
        incoming_weight = container_data.get("Weight Class", "")
        recommended_slot = recommendation.get("recommended_slot", "")

        prompt = f"""You are a container yard rehandle prediction expert.

A new container is being placed at slot {recommended_slot}.

Incoming container:
- Type: {incoming_type}
- POD: {incoming_pod}
- Weight Class: {incoming_weight}

Containers currently in this stack (same block, bay, row):
{stack_desc}

Predict how many rehandles will be needed when retrieving containers from this stack.
A rehandle occurs when a container on top must be moved to access a container below that departs earlier.

Rules:
1. If a container below departs BEFORE a container above it, the container above must be rehandled.
2. Compare vessel cutoff dates: earlier cutoff = departs sooner.
3. If cutoff dates are unknown, compare POD priority or assume FIFO order.
4. The incoming container will be placed on top of the current stack.

Respond ONLY with valid JSON (no markdown, no code fences):
{{"count": <integer>, "affected_containers": [{{"container_id": "<id>", "position": "<tier info>", "reason": "<why>"}}], "reasoning": "<explanation>"}}"""

        response = llm.generate(prompt)
        return _parse_rehandle_response(response)

    except Exception as e:
        logger.error(f"Error getting rehandle prediction: {e}")
        return {
            "count": 0,
            "affected_containers": [],
            "reasoning": f"Error during prediction: {str(e)}"
        }


def _parse_rehandle_response(response: str) -> Dict[str, Any]:
    """Parse LLM response for rehandle prediction."""
    # Try to extract JSON (may be wrapped in ```json ... ```)
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', response)
    json_str = json_match.group(1).strip() if json_match else response.strip()

    try:
        parsed = json.loads(json_str)
        return {
            "count": int(parsed.get("count", 0)),
            "affected_containers": parsed.get("affected_containers", []),
            "reasoning": parsed.get("reasoning", "")
        }
    except (json.JSONDecodeError, ValueError, TypeError):
        logger.warning("Could not parse rehandle JSON, extracting count with regex")
        count_match = re.search(r'"count"\s*:\s*(\d+)', response)
        count = int(count_match.group(1)) if count_match else 0
        return {
            "count": count,
            "affected_containers": [],
            "reasoning": response[:200]
        }


def update_neo4j_with_placement(container_data: Dict, recommendation: Dict):
    """Update Neo4j with new container placement."""
    logger.info("Updating Neo4j with placement...")
    
    container_id = container_data.get("Container ID", "")
    container_number = container_data.get("Container Number", "")
    recommended_slot = recommendation.get("recommended_slot", "")
    
    if not recommended_slot:
        logger.warning("No slot ID in recommendation, skipping Neo4j update")
        return
    
    # Parse slot ID (format: BLOCK-BAY-ROW-TIER)
    parts = recommended_slot.split("-")
    if len(parts) < 4:
        logger.warning(f"Invalid slot format: {recommended_slot}")
        return
    
    block_id = "-".join(parts[:2])  # e.g., "SS4-B5"
    bay = int(parts[2]) if parts[2].isdigit() else 0
    row = int(parts[3]) if parts[3].isdigit() else 0
    tier = int(parts[4]) if len(parts) > 4 and parts[4].isdigit() else 1
    
    query = """
    MERGE (c:Container {containerId: $container_id})
    SET c.containerNumber = $container_number,
        c.containerType = $container_type,
        c.pod = $pod,
        c.weightClass = $weight_class
    
    MERGE (s:Slot {slotId: $slot_id})
    SET s.blockId = $block_id,
        s.bay = $bay,
        s.row = $row,
        s.tier = $tier,
        s.isOccupied = true
    
    MERGE (c)-[:LOCATED_AT]->(s)
    
    RETURN c, s
    """
    
    params = {
        "container_id": container_id,
        "container_number": container_number,
        "container_type": container_data.get("Container Type", ""),
        "pod": container_data.get("POD", ""),
        "weight_class": container_data.get("Weight Class", ""),
        "slot_id": recommended_slot,
        "block_id": block_id,
        "bay": bay,
        "row": row,
        "tier": tier
    }
    
    try:
        neo4j_client.execute_query(query, params)
        logger.info(f"✅ Updated Neo4j with container {container_id} at {recommended_slot}")

        # Create STACKED_ON and BLOCKS relationships if tier > 1
        if tier > 1:
            stack_query = """
            MATCH (top:Container {containerId: $container_id})
            MATCH (below:Container)-[:LOCATED_AT]->(bs:Slot)
            WHERE bs.blockId = $block_id
              AND bs.bay = $bay
              AND bs.row = $row
              AND bs.tier = $tier_below
            MERGE (top)-[:STACKED_ON]->(below)
            MERGE (top)-[:BLOCKS]->(below)
            """
            neo4j_client.execute_query(stack_query, {
                "container_id": container_id,
                "block_id": block_id,
                "bay": bay,
                "row": row,
                "tier_below": tier - 1
            })
            logger.info(f"   Created STACKED_ON/BLOCKS relationships (tier {tier} → {tier - 1})")
    except Exception as e:
        logger.error(f"Error updating Neo4j: {e}")


def update_chromadb_with_placement(container_data: Dict, recommendation: Dict,
                                   rehandle_prediction: Dict = None):
    """Update ChromaDB with new placement for future learning."""
    logger.info("Updating ChromaDB with placement...")

    collection = chroma_client.get_or_create_collection(
        "historical_patterns",
        metadata={"description": "Historical container movement patterns"}
    )

    container_id = container_data.get("Container ID", "")
    container_type = container_data.get("Container Type", "")
    pod = container_data.get("POD", "")
    weight_class = container_data.get("Weight Class", "")
    recommended_slot = recommendation.get("recommended_slot", "")

    rehandle_count = rehandle_prediction.get("count", 0) if rehandle_prediction else 0
    rehandle_reasoning = rehandle_prediction.get("reasoning", "") if rehandle_prediction else ""

    description = f"""
    Container {container_id}: {container_type} container, {weight_class} weight
    POD: {pod}
    Placed at: {recommended_slot}
    Reasoning: {recommendation.get('reasoning', '')}
    Score: {recommendation.get('score', 0)}
    Predicted Rehandles: {rehandle_count}
    Rehandle Reasoning: {rehandle_reasoning}
    """.strip()

    metadata = {
        "container_id": container_id,
        "container_type": container_type,
        "pod": pod,
        "weight_class": weight_class,
        "slot_id": recommended_slot,
        "data_type": "simulation",
        "score": str(recommendation.get("score", 0)),
        "rehandle_count": str(rehandle_count)
    }
    
    try:
        collection.add(
            documents=[description],
            metadatas=[metadata],
            ids=[f"sim-{container_id}-{int(time.time())}"]
        )
        logger.info(f"✅ Added placement to ChromaDB for container {container_id}")
    except Exception as e:
        logger.error(f"Error updating ChromaDB: {e}")


def process_container(container_data: Dict, batch_num: int, container_num: int) -> Dict[str, Any]:
    """Process a single container through the full workflow."""
    container_id = container_data.get("Container ID", f"UNKNOWN-{batch_num}-{container_num}")
    logger.info(f"\n{'='*60}")
    logger.info(f"Processing Container {container_num} in Batch {batch_num}: {container_id}")
    logger.info(f"{'='*60}")
    
    # Step 1: Query ChromaDB
    chromadb_context = query_chromadb_for_recommendation(container_data)
    
    # Step 2: Query Neo4j
    neo4j_state = query_neo4j_yard_state()
    
    # Step 3: Get LLM Recommendation
    recommendation = get_llm_recommendation(container_data, chromadb_context, neo4j_state)

    # Step 3b: Rehandle prediction
    rehandle_prediction = {"count": 0, "affected_containers": [], "reasoning": ""}
    recommended_slot = recommendation.get("recommended_slot", "")
    slot_parts = recommended_slot.split("-")
    if len(slot_parts) >= 4:
        slot_block = "-".join(slot_parts[:2])
        slot_bay = int(slot_parts[2]) if slot_parts[2].isdigit() else 0
        slot_row = int(slot_parts[3]) if slot_parts[3].isdigit() else 0
        stack_containers = query_neo4j_stack_at_slot(slot_block, slot_bay, slot_row)
        rehandle_prediction = get_rehandle_prediction(
            container_data, recommendation, stack_containers
        )

    # Step 4: Display recommendation (log for now, frontend integration later)
    logger.info(f"📋 Recommendation for {container_id}:")
    logger.info(f"   Block: {recommendation.get('recommended_block')}")
    logger.info(f"   Slot: {recommendation.get('recommended_slot')}")
    logger.info(f"   Score: {recommendation.get('score')}")
    logger.info(f"   Reasoning: {recommendation.get('reasoning', '')[:100]}...")
    logger.info(f"   🔄 Predicted Rehandles: {rehandle_prediction.get('count', 0)}")
    if rehandle_prediction.get("affected_containers"):
        for ac in rehandle_prediction["affected_containers"]:
            logger.info(f"      - {ac.get('container_id')}: {ac.get('reason', '')}")
    logger.info(f"   Rehandle Reasoning: {rehandle_prediction.get('reasoning', '')[:100]}")

    # Step 5: Update Neo4j
    update_neo4j_with_placement(container_data, recommendation)

    # Step 6: Update ChromaDB
    update_chromadb_with_placement(container_data, recommendation, rehandle_prediction)

    return {
        "container_id": container_id,
        "recommendation": recommendation,
        "rehandle_prediction": rehandle_prediction,
        "status": "completed"
    }


def main():
    """Run the complete simulation test."""
    project_root = Path(__file__).parent.parent
    data_dir = project_root / "data"
    
    logger.info("="*60)
    logger.info("CONTAINER YARD SIMULATION TEST")
    logger.info("="*60)
    
    # Step 1: Load container data from SQLite
    logger.info("\n📂 Step 1: Loading container data from SQLite (containers_v2)...")

    all_containers = load_containers_from_sqlite(limit=50, offset=0)

    if len(all_containers) < 30:
        logger.error(f"Not enough data in SQLite. Found {len(all_containers)}, need at least 30.")
        sys.exit(1)

    # Step 2: Split — first 30 for training, then pick 20 unique containers
    training_data = all_containers[:30]

    seen_ids = set()
    unique_containers = []
    for row in all_containers[30:]:
        cid = row.get("Container ID", "")
        if cid and cid not in seen_ids:
            seen_ids.add(cid)
            unique_containers.append(row)
        if len(unique_containers) >= 20:
            break

    # If not enough from first 50, load more
    if len(unique_containers) < 20:
        logger.info(f"Only found {len(unique_containers)} unique containers, loading more...")
        extra = load_containers_from_sqlite(limit=100, offset=50)
        for row in extra:
            cid = row.get("Container ID", "")
            if cid and cid not in seen_ids:
                seen_ids.add(cid)
                unique_containers.append(row)
            if len(unique_containers) >= 20:
                break

    simulation_data = unique_containers

    logger.info(f"   Training data: {len(training_data)} rows")
    logger.info(f"   Simulation data: {len(simulation_data)} unique containers")

    # Step 2a: Load yard layout (blocks) to ChromaDB
    logger.info("\n📥 Step 2a: Loading yard layout to ChromaDB...")
    load_blocks_to_chromadb()

    # Step 2b: Load training data to ChromaDB
    logger.info("\n📥 Step 2b: Loading training data to ChromaDB...")
    load_training_data_to_chromadb(training_data)
    
    # Step 5: Split simulation data into batches
    batches = []
    for i in range(0, len(simulation_data), 5):
        batches.append(simulation_data[i:i+5])
    
    logger.info(f"\n📦 Step 4: Split into {len(batches)} batches of 5 containers each")
    
    # Step 6: Process each batch
    logger.info("\n🚀 Step 5: Starting simulation loop...")
    
    all_results = []
    for batch_num, batch in enumerate(batches, start=1):
        logger.info(f"\n{'#'*60}")
        logger.info(f"BATCH {batch_num} ({len(batch)} containers)")
        logger.info(f"{'#'*60}")
        
        batch_results = []
        for container_num, container_data in enumerate(batch, start=1):
            result = process_container(container_data, batch_num, container_num)
            batch_results.append(result)
            all_results.append(result)
            
            # Small delay between containers
            time.sleep(1)
        
        logger.info(f"\n✅ Batch {batch_num} completed: {len(batch_results)} containers processed")
    
    # Step 7: Summary
    logger.info("\n" + "="*60)
    logger.info("SIMULATION TEST COMPLETE")
    logger.info("="*60)
    logger.info(f"Total containers processed: {len(all_results)}")
    logger.info(f"Batches completed: {len(batches)}")
    logger.info(f"Success rate: {sum(1 for r in all_results if r.get('status') == 'completed') / len(all_results) * 100:.1f}%")
    
    # Save results
    results_file = data_dir / "simulation_results.json"
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    logger.info(f"\n✅ Results saved to {results_file}")


if __name__ == "__main__":
    main()

