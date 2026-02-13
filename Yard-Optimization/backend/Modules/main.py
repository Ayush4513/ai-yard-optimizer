"""FastAPI main application — unified server (Container CRUD + RAG/LLM)."""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging
import os
import json as json_lib
import re as re_lib

from Modules.database.chroma_client import chroma_client
from Modules.llm.llm_client import get_default_llm

# Lazy imports for heavy dependencies (may not be available on lightweight deploys)
try:
    from Modules.database.neo4j_client import neo4j_client
except ImportError:
    neo4j_client = None
    logging.getLogger(__name__).warning("Neo4j client not available (neo4j package missing)")

try:
    from Modules.rag.retrieval_chain import HybridRetrievalChain
except ImportError:
    HybridRetrievalChain = None
    logging.getLogger(__name__).warning("RAG retrieval chain not available (sentence-transformers missing)")

# SQLAlchemy (container DB)
from Database.database import engine, get_db
from Database import models, schemas
from Api.routes import router as extended_router

# v2 table name helpers (matching config.py USE_V2_TABLES=True)
def get_containers_table():
    return "containers_v2"

def get_locations_table():
    return "yard_locations_v2"

def get_blocks_table():
    return "blocks_v2"

# SQLite table creation will happen in startup event (not at import time)


class LLMGenerateRequest(BaseModel):
    prompt: str
    use_context: bool = False
    collection: str = "yard_rules"
    system_prompt: Optional[str] = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Container Yard Optimization API",
    description="AI-powered container yard optimization with RAG and Claude LLM",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include extended API routes (assign-location, batch, search, yards, blocks, reports, validate)
app.include_router(extended_router)


# ============================================================================
# CONTAINER ENDPOINTS
# ============================================================================

@app.get("/containers")
def get_containers(
    skip: int = 0,
    limit: int = 5000,
    db: Session = Depends(get_db)
):
    """Get containers with pagination. Uses v2 tables."""
    limit = min(limit, 50000)
    containers_table = get_containers_table()

    total = db.execute(text(f"SELECT COUNT(*) FROM {containers_table}")).scalar()

    containers = db.execute(text(f"""
        SELECT * FROM {containers_table}
        LIMIT :limit OFFSET :skip
    """), {"limit": limit, "skip": skip}).fetchall()

    col_info = db.execute(text(f"PRAGMA table_info({containers_table})")).fetchall()
    columns = [col[1] for col in col_info]

    containers_list = [
        {columns[i]: row[i] for i in range(len(columns))}
        for row in containers
    ]

    return {
        "data": containers_list,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": total,
            "has_more": skip + limit < total
        }
    }


@app.get("/containers/{container_id}")
def get_container(container_id: str, db: Session = Depends(get_db)):
    """Get a specific container by ID. Uses v2 tables."""
    containers_table = get_containers_table()

    col_info = db.execute(text(f"PRAGMA table_info({containers_table})")).fetchall()
    columns = [col[1] for col in col_info]

    container = db.execute(text(f"""
        SELECT * FROM {containers_table} WHERE container_id = :container_id
    """), {"container_id": container_id}).fetchone()

    if not container:
        raise HTTPException(status_code=404, detail="Container not found")

    return {columns[i]: container[i] for i in range(len(columns))}


@app.post("/containers")
def create_container(container: schemas.ContainerCreate, db: Session = Depends(get_db)):
    """Create a new container. Uses v2 tables."""
    containers_table = get_containers_table()
    locations_table = get_locations_table()
    blocks_table = get_blocks_table()

    # Check if container already exists
    existing = db.execute(text(f"""
        SELECT container_id FROM {containers_table} WHERE container_number = :container_number
    """), {"container_number": container.container_number}).fetchone()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Container {container.container_number} already exists"
        )

    container_data = container.dict()

    # Check if placement info is provided
    has_placement = (
        container_data.get("block_id") and
        container_data.get("bay") and
        container_data.get("row") and
        container_data.get("tier")
    )

    location_id = None
    if has_placement:
        location = db.execute(text(f"""
            SELECT location_id, occupied FROM {locations_table}
            WHERE block_id = :block_id AND bay = :bay AND row = :row AND tier = :tier
        """), {
            "block_id": container_data["block_id"],
            "bay": container_data["bay"],
            "row": container_data["row"],
            "tier": container_data["tier"]
        }).fetchone()

        if location:
            location_id, occupied = location
            if occupied:
                raise HTTPException(
                    status_code=400,
                    detail=f"Location {location_id} is already occupied"
                )
            container_data["current_location_id"] = location_id

    # Build INSERT statement dynamically
    columns = list(container_data.keys())
    placeholders = [f":{col}" for col in columns]

    db.execute(text(f"""
        INSERT INTO {containers_table} ({', '.join(columns)})
        VALUES ({', '.join(placeholders)})
    """), container_data)

    # If placement was provided, update location and block
    if has_placement and location_id:
        db.execute(text(f"""
            UPDATE {locations_table}
            SET occupied = 1, container_id = :container_id, status = 'actual'
            WHERE location_id = :location_id
        """), {"container_id": container_data["container_id"], "location_id": location_id})

        db.execute(text(f"""
            UPDATE {blocks_table}
            SET occupied_slots = occupied_slots + 1
            WHERE block_id = :block_id
        """), {"block_id": container_data["block_id"]})

    db.commit()

    return {
        "message": "Container created successfully",
        "placed": has_placement and location_id is not None,
        "location_id": location_id,
        **container_data
    }


@app.put("/containers/{container_id}")
def update_container(
    container_id: str,
    container: schemas.ContainerUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing container. Uses v2 tables."""
    containers_table = get_containers_table()

    existing = db.execute(text(f"""
        SELECT container_id FROM {containers_table} WHERE container_id = :container_id
    """), {"container_id": container_id}).fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="Container not found")

    update_data = container.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Check if location assignment is being made
    has_location_update = (
        update_data.get("block_id") and
        update_data.get("bay") is not None and
        update_data.get("row") is not None and
        update_data.get("tier") is not None
    )

    locations_table = get_locations_table()
    blocks_table = get_blocks_table()
    location_id = update_data.get("current_location_id")

    if has_location_update and not location_id:
        # Look up location_id from block/bay/row/tier
        loc = db.execute(text(f"""
            SELECT location_id, occupied FROM {locations_table}
            WHERE block_id = :block_id AND bay = :bay AND row = :row AND tier = :tier
        """), {
            "block_id": update_data["block_id"],
            "bay": update_data["bay"],
            "row": update_data["row"],
            "tier": update_data["tier"]
        }).fetchone()

        if loc:
            location_id = loc[0]
            is_occupied = loc[1]
            if is_occupied:
                raise HTTPException(
                    status_code=400,
                    detail=f"Location {location_id} is already occupied"
                )
            update_data["current_location_id"] = location_id

    set_clauses = [f"{col} = :{col}" for col in update_data.keys()]
    update_data["container_id"] = container_id

    db.execute(text(f"""
        UPDATE {containers_table}
        SET {', '.join(set_clauses)}
        WHERE container_id = :container_id
    """), update_data)

    # If location was assigned, mark it occupied and update block stats
    if has_location_update and location_id:
        db.execute(text(f"""
            UPDATE {locations_table}
            SET occupied = 1, container_id = :container_id, status = 'actual'
            WHERE location_id = :location_id
        """), {"container_id": container_id, "location_id": location_id})

        db.execute(text(f"""
            UPDATE {blocks_table}
            SET occupied_slots = occupied_slots + 1
            WHERE block_id = :block_id
        """), {"block_id": update_data["block_id"]})

    db.commit()

    return {
        "message": f"Container {container_id} updated successfully",
        "placed": has_location_update and location_id is not None,
        "location_id": location_id
    }


@app.delete("/containers/{container_id}")
def delete_container(container_id: str, db: Session = Depends(get_db)):
    """Delete a container. Uses v2 tables."""
    containers_table = get_containers_table()

    existing = db.execute(text(f"""
        SELECT container_id FROM {containers_table} WHERE container_id = :container_id
    """), {"container_id": container_id}).fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="Container not found")

    db.execute(text(f"""
        DELETE FROM {containers_table} WHERE container_id = :container_id
    """), {"container_id": container_id})
    db.commit()

    return {"message": f"Container {container_id} deleted successfully"}


# ============================================================================
# YARD LOCATION ENDPOINTS
# ============================================================================

@app.get("/locations")
def get_locations(
    yard_name: str = None,
    block_id: str = None,
    occupied: bool = None,
    skip: int = 0,
    limit: int = 5000,
    db: Session = Depends(get_db)
):
    """Get yard locations with optional filters. Uses v2 tables."""
    limit = min(limit, 50000)
    locations_table = get_locations_table()

    conditions = []
    params = {"limit": limit, "skip": skip}

    if yard_name:
        conditions.append("yard_name = :yard_name")
        params["yard_name"] = yard_name
    if block_id:
        conditions.append("block_id = :block_id")
        params["block_id"] = block_id
    if occupied is not None:
        conditions.append("occupied = :occupied")
        params["occupied"] = 1 if occupied else 0

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    total = db.execute(text(f"SELECT COUNT(*) FROM {locations_table} WHERE {where_clause}"), params).scalar()

    locations = db.execute(text(f"""
        SELECT location_id, yard_name, block_id, bay, row, tier, occupied, container_id, status
        FROM {locations_table}
        WHERE {where_clause}
        LIMIT :limit OFFSET :skip
    """), params).fetchall()

    locations_list = [
        {
            "location_id": loc[0],
            "yard_name": loc[1],
            "block_id": loc[2],
            "bay": loc[3],
            "row": loc[4],
            "tier": loc[5],
            "occupied": bool(loc[6]),
            "container_id": loc[7],
            "status": loc[8],
        }
        for loc in locations
    ]

    return {
        "data": locations_list,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": total,
            "has_more": skip + limit < total
        }
    }


@app.get("/locations/{location_id}", response_model=schemas.YardLocation)
def get_location(location_id: str, db: Session = Depends(get_db)):
    """Get a specific yard location"""
    location = db.query(models.YardLocation).filter(
        models.YardLocation.location_id == location_id
    ).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@app.post("/locations", response_model=schemas.YardLocation)
def create_location(location: schemas.YardLocationCreate, db: Session = Depends(get_db)):
    """Create a new yard location"""
    db_location = models.YardLocation(**location.dict())
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location


@app.put("/locations/{location_id}", response_model=schemas.YardLocation)
def update_location(location_id: str, location: schemas.YardLocationUpdate, db: Session = Depends(get_db)):
    """Update a yard location"""
    db_location = db.query(models.YardLocation).filter(
        models.YardLocation.location_id == location_id
    ).first()
    if not db_location:
        raise HTTPException(status_code=404, detail="Location not found")
    update_data = location.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_location, field, value)
    db.commit()
    db.refresh(db_location)
    return db_location


# ============================================================================
# PLACEMENT & OPTIMIZATION ENDPOINTS
# ============================================================================

@app.post("/optimize/placement", response_model=schemas.PlacementRecommendation)
def get_placement_recommendation(request: schemas.PlacementRequest, db: Session = Depends(get_db)):
    """Get AI-powered placement recommendations for a container using LLM + RAG."""
    containers_table = get_containers_table()
    locations_table = get_locations_table()
    blocks_table = get_blocks_table()

    # ── 1. Available slots with block metadata ──
    available = db.execute(text(f"""
        SELECT yl.*, b.block_type, b.reefer_plugs, b.hazmat_certified, b.yard_name as b_yard_name,
               b.total_slots, b.occupied_slots, b.bays, b.rows, b.max_tier, b.primary_use
        FROM {locations_table} yl
        JOIN {blocks_table} b ON yl.block_id = b.block_id
        WHERE yl.occupied = 0
        ORDER BY yl.tier ASC, yl.block_id, yl.bay, yl.row
        LIMIT 100
    """)).mappings().all()

    if not available:
        raise HTTPException(status_code=404, detail="No available locations found")

    # ── 2. Block stats with utilization ──
    block_stats = db.execute(text(f"""
        SELECT b.block_id, b.yard_name, b.block_type, b.total_slots, b.occupied_slots,
               b.reefer_plugs, b.hazmat_certified, b.primary_use,
               ROUND(CAST(b.occupied_slots AS FLOAT) / b.total_slots * 100, 1) as util_pct
        FROM {blocks_table} b
    """)).mappings().all()
    block_stats_map = {bs["block_id"]: dict(bs) for bs in block_stats}

    # ── 3. POD clustering: containers with same POD per block ──
    pod_cluster = {}
    if request.pod:
        pod_rows = db.execute(text(f"""
            SELECT block_id, COUNT(*) as cnt
            FROM {containers_table}
            WHERE pod = :pod AND block_id IS NOT NULL
            GROUP BY block_id
            ORDER BY cnt DESC
        """), {"pod": request.pod}).fetchall()
        pod_cluster = {r[0]: r[1] for r in pod_rows}

    # ── 4. Weight context: containers below each available slot ──
    stack_context = {}
    for slot in available[:60]:
        if int(slot["tier"]) > 1:
            below = db.execute(text(f"""
                SELECT c.weight_class, c.pod, c.container_type
                FROM {locations_table} yl
                JOIN {containers_table} c ON yl.container_id = c.container_id
                WHERE yl.block_id = :bid AND yl.bay = :bay AND yl.row = :row AND yl.tier < :tier
                ORDER BY yl.tier ASC
            """), {"bid": slot["block_id"], "bay": slot["bay"], "row": slot["row"], "tier": slot["tier"]}).fetchall()
            if below:
                stack_context[slot["location_id"]] = [
                    {"weight_class": r[0], "pod": r[1], "type": r[2]} for r in below
                ]

    # ── 5. ChromaDB yard rules context ──
    rules_context = ""
    try:
        rules_col = chroma_client.client.get_collection("yard_rules")
        if rules_col.count() > 0:
            results = rules_col.query(
                query_texts=[f"placement rules for {request.container_type or 'general'} {request.weight_class or ''} container going to {request.pod or 'any port'}"],
                n_results=5
            )
            if results and results.get("documents"):
                rules_context = "\n".join(results["documents"][0])
    except Exception:
        logger.debug("ChromaDB yard_rules query failed, continuing without context")

    # ── 6. Build rich LLM prompt ──
    # Block overview with real utilization
    block_lines = []
    for bs in block_stats:
        pod_count = pod_cluster.get(bs["block_id"], 0)
        pod_info = f", {pod_count} containers with same POD ({request.pod})" if pod_count else ""
        block_lines.append(
            f"  - {bs['block_id']} ({bs['yard_name']}): {bs['block_type']} block, "
            f"{bs['occupied_slots']}/{bs['total_slots']} occupied ({bs['util_pct']}%){pod_info}"
        )
    block_overview = "\n".join(block_lines)

    # Available slots with stack context (top 30 for prompt brevity)
    slot_lines = []
    for s in available[:30]:
        loc_id = s["location_id"]
        tier = int(s["tier"])
        stack_info = ""
        if loc_id in stack_context:
            below_items = stack_context[loc_id]
            below_desc = ", ".join([f"T{i+1}:{c['weight_class']}/{c['pod'] or '?'}" for i, c in enumerate(below_items)])
            stack_info = f" [below: {below_desc}]"
        elif tier == 1:
            stack_info = " [ground level - empty stack]"
        slot_lines.append(
            f"  - {loc_id} (block={s['block_id']}, tier={tier}, type={s.get('block_type', '?')}){stack_info}"
        )
    slots_text = "\n".join(slot_lines)

    # Container type matching guidance
    type_guidance = ""
    if request.reefer_flag:
        type_guidance = "CRITICAL: This is a REEFER container — MUST be placed in a Reefer block (LS1-B1 or SS1-B1)."
    elif request.hazmat_flag:
        type_guidance = "CRITICAL: This is a HAZMAT container — MUST be placed in a Hazmat block (LS4-B1 or SS5-B4)."
    elif request.container_type == "OOG":
        type_guidance = "CRITICAL: This is an OOG container — MUST be placed in the OOG yard."

    # Weight stacking guidance
    weight_guidance = ""
    if request.weight_class == "Heavy":
        weight_guidance = "Weight rule: Heavy containers (>=20MT) must NOT be placed above tier 2."
    elif request.weight_class == "Light":
        weight_guidance = "Weight rule: Light containers should be placed on higher tiers (above heavier ones)."

    prompt = f"""You are a container yard optimization expert at a real port terminal. Analyze the yard state and recommend the TOP 3 optimal placement locations.

═══ CONTAINER TO PLACE ═══
- ID: {request.container_id}
- Type: {request.container_type or 'Dry'}
- Port of Discharge (POD): {request.pod or 'Unknown'}
- Weight Class: {request.weight_class or 'Medium'}
- Hazmat: {request.hazmat_flag}
- Reefer: {request.reefer_flag}

═══ PLACEMENT CONSTRAINTS ═══
{type_guidance}
{weight_guidance}
- Stack integrity: lower tiers must be occupied before placing on higher tiers
- Heavier containers go on lower tiers, lighter on top
- Group containers by same POD in the same block/bay for efficient vessel loading
- Sea-Side (SS) blocks are closer to the quay (better for exports)
- Land-Side (LS) blocks are closer to the gate (better for imports)

═══ YARD RULES (from knowledge base) ═══
{rules_context or 'Standard terminal stacking rules apply.'}

═══ CURRENT BLOCK STATE ═══
{block_overview}

═══ AVAILABLE SLOTS (with stack context) ═══
{slots_text}

═══ TASK ═══
Choose exactly 3 locations from the available slots above. For EACH recommendation, provide:
- A placement SCORE (0-100) reflecting overall optimality
- 2-4 specific REASONS referencing the actual data (e.g., "Block SS3-B1 already has 29 Singapore containers — best POD clustering")
- WARNINGS for any trade-offs (e.g., "Tier 3 placement — 2 containers below will need rehandling for retrieval")
- REHANDLE_RISK (0-100) based on tier height and blocking containers
- Estimated retrieval time in minutes

Return ONLY a JSON array:
[
  {{"location_id": "...", "block_id": "...", "bay": N, "row": N, "tier": N, "score": N, "reasons": ["...", "..."], "warnings": ["..."], "rehandle_risk": N, "estimated_retrieval_minutes": N, "pod_cluster_pct": N, "weight_compliant": true/false}},
  ...
]"""

    # ── 7. Call LLM and parse response ──
    recommendations = []
    try:
        llm = get_default_llm()
        if llm:
            response = llm.generate(prompt)
            logger.info(f"LLM response received ({len(response)} chars)")

            parsed = None
            # Strategy 1: code block extraction
            code_match = re_lib.search(r'```(?:json)?\s*([\s\S]*?)```', response)
            if code_match:
                try:
                    parsed = json_lib.loads(code_match.group(1).strip())
                except json_lib.JSONDecodeError:
                    pass
            # Strategy 2: balanced bracket matching
            if parsed is None:
                start_idx = response.find('[')
                if start_idx != -1:
                    depth = 0
                    end_idx = start_idx
                    for i in range(start_idx, len(response)):
                        if response[i] == '[': depth += 1
                        elif response[i] == ']':
                            depth -= 1
                            if depth == 0:
                                end_idx = i + 1
                                break
                    try:
                        parsed = json_lib.loads(response[start_idx:end_idx])
                    except json_lib.JSONDecodeError:
                        pass

            if parsed:
                for idx, rec in enumerate(parsed[:3]):
                    loc_id = rec.get("location_id", "")
                    matching = [s for s in available if s["location_id"] == loc_id]
                    if matching:
                        slot = matching[0]
                    else:
                        slot = available[idx] if idx < len(available) else available[0]
                        loc_id = slot["location_id"]

                    bid = slot.get("block_id", "")
                    bs = block_stats_map.get(bid, {})
                    tier = int(slot["tier"])
                    is_sea_side = bid.startswith("SS")
                    pod_in_block = pod_cluster.get(bid, 0)
                    total_pod = sum(pod_cluster.values()) if pod_cluster else 1
                    pod_pct = rec.get("pod_cluster_pct", round(pod_in_block / max(total_pod, 1) * 100))

                    recommendations.append({
                        "rank": idx + 1,
                        "location": {
                            "location_id": loc_id,
                            "yard_name": slot.get("yard_name", ""),
                            "block_id": bid,
                            "bay": int(slot["bay"]),
                            "row": int(slot["row"]),
                            "tier": tier,
                            "occupied": False,
                        },
                        "score": rec.get("score", 90 - idx * 5),
                        "reasons": rec.get("reasons", ["LLM recommended"]),
                        "warnings": rec.get("warnings", []),
                        "estimated_retrieval_minutes": rec.get("estimated_retrieval_minutes", 3 + (tier - 1) * 2),
                        "metrics": {
                            "rehandle_risk_percent": rec.get("rehandle_risk", min(tier * 15, 80)),
                            "blocking_containers": max(tier - 1, 0),
                            "distance_to_quay_m": 80 + idx * 30 if is_sea_side else 350 + idx * 30,
                            "distance_to_gate_m": 350 + idx * 30 if is_sea_side else 80 + idx * 30,
                            "pod_cluster_match_percent": pod_pct,
                            "weight_stack_compliant": rec.get("weight_compliant", True),
                            "block_utilization_percent": round(float(bs.get("util_pct", 70))),
                        }
                    })
    except Exception as e:
        logger.warning(f"LLM recommendation failed: {e}")

    # ── 8. Fallback if LLM produced fewer than 3 ──
    while len(recommendations) < 3:
        idx = len(recommendations)
        slot = available[idx] if idx < len(available) else available[0]
        bid = slot.get("block_id", "")
        bs = block_stats_map.get(bid, {})
        tier = int(slot["tier"])
        is_sea_side = bid.startswith("SS")
        pod_in_block = pod_cluster.get(bid, 0)
        total_pod = sum(pod_cluster.values()) if pod_cluster else 1

        recommendations.append({
            "rank": idx + 1,
            "location": {
                "location_id": slot["location_id"],
                "yard_name": slot.get("yard_name", ""),
                "block_id": bid,
                "bay": int(slot["bay"]),
                "row": int(slot["row"]),
                "tier": tier,
                "occupied": False,
            },
            "score": 80 - idx * 5,
            "reasons": [
                f"Available slot at tier {tier} in {bs.get('block_type', 'General')} block",
                f"Block utilization: {bs.get('util_pct', '?')}%",
                f"{pod_in_block} same-POD containers already in this block" if pod_in_block else "Balanced block utilization",
            ],
            "warnings": ["Fallback recommendation (LLM unavailable)"] if idx == 0 else [
                "Fallback recommendation",
                f"Tier {tier} — {tier - 1} container(s) below will need rehandling" if tier > 1 else ""
            ],
            "estimated_retrieval_minutes": 3 + (tier - 1) * 2,
            "metrics": {
                "rehandle_risk_percent": min(tier * 15, 80),
                "blocking_containers": max(tier - 1, 0),
                "distance_to_quay_m": 80 + idx * 30 if is_sea_side else 350 + idx * 30,
                "distance_to_gate_m": 350 + idx * 30 if is_sea_side else 80 + idx * 30,
                "pod_cluster_match_percent": round(pod_in_block / max(total_pod, 1) * 100),
                "weight_stack_compliant": True,
                "block_utilization_percent": round(float(bs.get("util_pct", 70))),
            }
        })

    return {"container_id": request.container_id, "recommendations": recommendations[:3]}


# ============================================================================
# STATISTICS & ANALYTICS ENDPOINTS
# ============================================================================

@app.get("/stats/overview")
def get_yard_stats(db: Session = Depends(get_db)):
    """Get overall yard statistics. Uses v2 tables."""
    containers_table = get_containers_table()
    locations_table = get_locations_table()

    total_containers = db.execute(text(f"SELECT COUNT(*) FROM {containers_table}")).scalar()
    total_locations = db.execute(text(f"SELECT COUNT(*) FROM {locations_table}")).scalar()
    occupied_locations = db.execute(text(f"SELECT COUNT(*) FROM {locations_table} WHERE occupied = 1")).scalar()

    return {
        "total_containers": total_containers,
        "total_locations": total_locations,
        "occupied_locations": occupied_locations,
        "available_locations": total_locations - occupied_locations,
        "occupancy_rate": round((occupied_locations / total_locations * 100), 2) if total_locations > 0 else 0,
    }


@app.get("/stats/containers")
def get_container_stats(db: Session = Depends(get_db)):
    """Get container statistics. Uses v2 tables."""
    containers_table = get_containers_table()

    total = db.execute(text(f"SELECT COUNT(*) FROM {containers_table}")).scalar()

    by_type = db.execute(text(f"""
        SELECT container_type, COUNT(*) FROM {containers_table}
        GROUP BY container_type
    """)).fetchall()

    by_status = db.execute(text(f"""
        SELECT customs_status, COUNT(*) FROM {containers_table}
        GROUP BY customs_status
    """)).fetchall()

    return {
        "total": total,
        "by_type": {t: c for t, c in by_type},
        "by_status": {s: c for s, c in by_status}
    }


# ============================================================================
# RAG & LLM ENDPOINTS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize databases on startup."""
    logger.info("Starting up application...")

    # Wait a bit for databases to be ready (when running in Docker)
    import time
    if os.getenv("DOCKER_ENV"):
        logger.info("Running in Docker - waiting for databases...")
        time.sleep(5)

    # Initialize SQLite database (non-blocking - app can start even if this fails)
    try:
        # engine is already imported at top of file
        models.Base.metadata.create_all(bind=engine)
        logger.info("SQLite database initialized successfully")
    except Exception as e:
        logger.warning(f"SQLite database initialization failed (non-critical): {e}")
        logger.info("Application will continue without SQLite CRUD features")

    # Initialize Neo4j (skip if not available)
    if neo4j_client is not None:
        max_retries = 5
        for attempt in range(max_retries):
            if neo4j_client.connect():
                neo4j_client.initialize_schema()
                logger.info("Neo4j initialized successfully")
                break
            else:
                if attempt < max_retries - 1:
                    logger.warning(f"Failed to connect to Neo4j (attempt {attempt + 1}/{max_retries}), retrying...")
                    time.sleep(3)
                else:
                    logger.error("Failed to initialize Neo4j after multiple attempts")
    else:
        logger.info("Neo4j client not available — skipping initialization")

    # Initialize ChromaDB collections
    max_retries = 5
    for attempt in range(max_retries):
        try:
            chroma_client.initialize_collections()
            logger.info("ChromaDB initialized successfully")
            break
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(f"Failed to connect to ChromaDB (attempt {attempt + 1}/{max_retries}), retrying...")
                time.sleep(3)
            else:
                logger.error(f"Failed to initialize ChromaDB after multiple attempts: {e}")

    # Check LLM availability
    llm = get_default_llm()
    if llm and llm.is_available():
        logger.info("✅ LLM available (Anthropic Claude)")
    else:
        logger.warning("⚠️  LLM not available. Add ANTHROPIC_API_KEY to .env file")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Shutting down application...")
    if neo4j_client is not None:
        neo4j_client.close()


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Container Yard Optimization API",
        "status": "running",
        "version": "1.0.0",
        "llm_available": get_default_llm() is not None and get_default_llm().is_available() if get_default_llm() else False
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    neo4j_status = "connected" if (neo4j_client and neo4j_client.driver) else "not available"
    chromadb_status = "ready" if chroma_client.client else "not ready"
    # Check LLM availability
    llm = get_default_llm()
    llm_status = "available" if (llm and llm.is_available()) else "not configured"

    # Check ChromaDB collections
    collections_info = {}
    try:
        collections = chroma_client.initialize_collections()
        for name, collection in collections.items():
            collections_info[name] = collection.count()
    except:
        pass

    return {
        "status": "healthy",
        "neo4j": neo4j_status,
        "chromadb": chromadb_status,
        "llm": llm_status,
        "collections": collections_info
    }


@app.post("/api/v1/rag/retrieve")
async def rag_retrieve(query: str, collection: str = "yard_rules", use_llm: bool = False):
    """RAG retrieval endpoint with optional LLM generation using Anthropic Claude."""
    if HybridRetrievalChain is None:
        raise HTTPException(status_code=503, detail="RAG retrieval not available (sentence-transformers not installed)")

    try:
        # Create retrieval chain for specified collection
        chain = HybridRetrievalChain(collection_name=collection, use_llm=use_llm)

        if use_llm:
            # Use RAG chain with Anthropic Claude
            rag_result = chain.rag_chain(query, top_k=5)
            return {
                "query": query,
                "collection": collection,
                "results": {
                    "chromadb_count": len(rag_result["retrieval_results"]["chromadb_results"]),
                    "neo4j_count": len(rag_result["retrieval_results"]["neo4j_results"])
                },
                "formatted_context": chain.format_context(rag_result["retrieval_results"]),
                "llm_response": rag_result.get("llm_response"),
                "error": rag_result.get("error")
            }
        else:
            # Perform hybrid retrieval only (no LLM)
            results = chain.hybrid_retrieve(query)
            context = chain.format_context(results)

            return {
                "query": query,
                "collection": collection,
                "results": {
                    "chromadb_count": len(results["chromadb_results"]),
                    "neo4j_count": len(results["neo4j_results"])
                },
                "formatted_context": context,
                "llm_response": None
            }
    except Exception as e:
        logger.error(f"RAG retrieval error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/llm/generate")
async def llm_generate(request: LLMGenerateRequest):
    """Generate text using Anthropic Claude LLM with optional RAG context."""
    llm = get_default_llm()
    if not llm or not llm.is_available():
        raise HTTPException(
            status_code=503,
            detail="LLM not available. Add ANTHROPIC_API_KEY to .env file"
        )

    try:
        if request.use_context:
            if HybridRetrievalChain is None:
                raise HTTPException(status_code=503, detail="RAG context not available (sentence-transformers not installed)")
            # Retrieve relevant context
            chain = HybridRetrievalChain(collection_name=request.collection)
            retrieval_results = chain.hybrid_retrieve(request.prompt)
            context = chain.format_context(retrieval_results)

            # Generate with context
            response = llm.generate_with_context(context, request.prompt)
        else:
            # Generate without context
            response = llm.generate(request.prompt)

        return {
            "prompt": request.prompt,
            "response": response,
            "used_context": request.use_context,
            "collection": request.collection if request.use_context else None
        }
    except Exception as e:
        logger.error(f"LLM generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
