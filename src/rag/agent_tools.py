"""LangChain agent tools for querying SQLite, Neo4j, and ChromaDB."""
from langchain.tools import StructuredTool
from typing import Optional, List, Dict, Any
import logging
from src.database.sqlite_client import sqlite_client
from src.database.neo4j_client import neo4j_client
from src.database.chroma_client import chroma_client
from src.rag.retrieval_chain import HybridRetrievalChain

logger = logging.getLogger(__name__)


def query_yard_state(zone: Optional[str] = None) -> Dict[str, Any]:
    """
    Query the current yard state including container positions and occupancy by zone.
    
    Args:
        zone: Optional zone type filter (e.g., "Export", "Import", "General")
    
    Returns:
        Dictionary with yard state information including occupancy, container counts, and zone details
    """
    try:
        # Build Neo4j query based on zone filter
        if zone:
            query = """
            MATCH (s:Slot)
            WHERE s.zoneType = $zone
            OPTIONAL MATCH (s)<-[:LOCATED_AT]-(c:Container)
            WITH s, collect(c) as containers
            RETURN s.zoneType as zone,
                   s.yardName as yard_name,
                   s.blockId as block_id,
                   count(s) as total_slots,
                   sum(CASE WHEN s.isOccupied THEN 1 ELSE 0 END) as occupied_slots,
                   count(containers) as container_count
            ORDER BY s.yardName, s.blockId
            """
            results = neo4j_client.execute_query(query, {"zone": zone})
        else:
            query = """
            MATCH (s:Slot)
            OPTIONAL MATCH (s)<-[:LOCATED_AT]-(c:Container)
            WITH s, collect(c) as containers
            RETURN s.zoneType as zone,
                   s.yardName as yard_name,
                   s.blockId as block_id,
                   count(s) as total_slots,
                   sum(CASE WHEN s.isOccupied THEN 1 ELSE 0 END) as occupied_slots,
                   count(containers) as container_count
            ORDER BY s.zoneType, s.yardName, s.blockId
            """
            results = neo4j_client.execute_query(query)
        
        # Aggregate results
        summary = {
            "total_slots": 0,
            "occupied_slots": 0,
            "available_slots": 0,
            "zones": {}
        }
        
        for result in results:
            zone_name = result.get("zone", "Unknown")
            if zone_name not in summary["zones"]:
                summary["zones"][zone_name] = {
                    "total_slots": 0,
                    "occupied_slots": 0,
                    "blocks": []
                }
            
            summary["zones"][zone_name]["total_slots"] += result.get("total_slots", 0)
            summary["zones"][zone_name]["occupied_slots"] += result.get("occupied_slots", 0)
            summary["zones"][zone_name]["blocks"].append({
                "block_id": result.get("block_id"),
                "yard_name": result.get("yard_name"),
                "total_slots": result.get("total_slots", 0),
                "occupied_slots": result.get("occupied_slots", 0)
            })
            
            summary["total_slots"] += result.get("total_slots", 0)
            summary["occupied_slots"] += result.get("occupied_slots", 0)
        
        summary["available_slots"] = summary["total_slots"] - summary["occupied_slots"]
        summary["occupancy_rate"] = (
            (summary["occupied_slots"] / summary["total_slots"] * 100) 
            if summary["total_slots"] > 0 else 0
        )
        
        return summary
    except Exception as e:
        logger.error(f"Error querying yard state: {e}")
        return {"error": str(e)}


def find_container(container_id: str) -> Dict[str, Any]:
    """
    Find a container by ID and return its current location and status.
    
    Args:
        container_id: Container ID or container number to search for
    
    Returns:
        Dictionary with container details, location, and blocking information
    """
    try:
        # Try to find by container ID first, then by container number
        query = """
        MATCH (c:Container)
        WHERE c.containerId = $container_id OR c.containerNumber = $container_id
        OPTIONAL MATCH (c)-[:LOCATED_AT]->(s:Slot)
        OPTIONAL MATCH (s)-[:BELONGS_TO_BLOCK]->(b:Block)
        OPTIONAL MATCH (blocker:Container)-[:BLOCKS]->(c)
        OPTIONAL MATCH (c)-[:STACKED_ON]->(below:Container)
        OPTIONAL MATCH (c)-[:ASSIGNED_TO]->(v:Vessel)
        RETURN c,
               s,
               b,
               v,
               collect(DISTINCT blocker.containerId) as blocking_containers,
               collect(DISTINCT blocker.containerNumber) as blocking_numbers,
               collect(DISTINCT below.containerId) as stacked_on_containers
        LIMIT 1
        """
        
        results = neo4j_client.execute_query(query, {"container_id": container_id})
        
        if not results:
            return {"error": f"Container {container_id} not found"}
        
        result = results[0]
        container = result.get("c", {})
        slot = result.get("s", {})
        block = result.get("b", {})
        vessel = result.get("v", {})
        
        return {
            "container_id": container.get("containerId"),
            "container_number": container.get("containerNumber"),
            "container_type": container.get("containerType"),
            "status": container.get("status"),
            "weight_class": container.get("weightClass"),
            "pod": container.get("pod"),
            "location": {
                "slot_id": slot.get("slotId"),
                "block_id": slot.get("blockId") or container.get("blockId"),
                "yard_name": slot.get("yardName"),
                "bay": container.get("bay"),
                "row": container.get("row"),
                "tier": container.get("tier")
            } if slot or container.get("blockId") else None,
            "block": {
                "block_id": block.get("blockId"),
                "block_name": block.get("blockName"),
                "block_type": block.get("blockType")
            } if block else None,
            "vessel": {
                "vessel_id": vessel.get("vesselId"),
                "voyage_number": vessel.get("voyageNumber")
            } if vessel else None,
            "blocking_containers": result.get("blocking_containers", []),
            "blocking_numbers": result.get("blocking_numbers", []),
            "stacked_on_containers": result.get("stacked_on_containers", [])
        }
    except Exception as e:
        logger.error(f"Error finding container: {e}")
        return {"error": str(e)}


def get_blocking_analysis(container_id: str) -> List[Dict[str, Any]]:
    """
    Get a list of containers that need to be moved before accessing the target container.
    
    Args:
        container_id: Container ID or container number
    
    Returns:
        List of dictionaries with blocking container details and move order
    """
    try:
        query = """
        MATCH (target:Container)
        WHERE target.containerId = $container_id OR target.containerNumber = $container_id
        MATCH path = (blocker:Container)-[:BLOCKS*]->(target)
        WITH blocker, length(path) as depth
        ORDER BY depth DESC
        RETURN DISTINCT blocker.containerId as container_id,
               blocker.containerNumber as container_number,
               blocker.containerType as container_type,
               blocker.weightClass as weight_class,
               blocker.bay as bay,
               blocker.row as row,
               blocker.tier as tier,
               depth as move_order
        """
        
        results = neo4j_client.execute_query(query, {"container_id": container_id})
        
        if not results:
            # Check if container exists
            container_info = find_container(container_id)
            if "error" in container_info:
                return [{"error": container_info["error"]}]
            return []  # No blocking containers
        
        return results
    except Exception as e:
        logger.error(f"Error getting blocking analysis: {e}")
        return [{"error": str(e)}]


def search_rules(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Search yard stacking rules using semantic search in ChromaDB.
    
    Args:
        query: Natural language query about stacking rules
        top_k: Number of top results to return
    
    Returns:
        List of dictionaries with rule content, metadata, and relevance scores
    """
    try:
        chain = HybridRetrievalChain(collection_name="yard_rules", use_llm=False)
        results = chain.retrieve_from_chromadb(query, top_k=top_k)
        
        # Format results
        formatted_results = []
        for result in results:
            formatted_results.append({
                "content": result.get("content", ""),
                "rule_name": result.get("metadata", {}).get("ruleName", "Unknown"),
                "category": result.get("metadata", {}).get("category", "Unknown"),
                "priority": result.get("metadata", {}).get("priority", "Unknown"),
                "score": result.get("score", 0.0)
            })
        
        return formatted_results
    except Exception as e:
        logger.error(f"Error searching rules: {e}")
        return [{"error": str(e)}]


def search_patterns(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Search historical container movement patterns using semantic search in ChromaDB.
    
    Args:
        query: Natural language query about historical patterns
        top_k: Number of top results to return
    
    Returns:
        List of dictionaries with pattern content, metadata, and relevance scores
    """
    try:
        chain = HybridRetrievalChain(collection_name="historical_patterns", use_llm=False)
        results = chain.retrieve_from_chromadb(query, top_k=top_k)
        
        # Format results
        formatted_results = []
        for result in results:
            formatted_results.append({
                "content": result.get("content", ""),
                "metadata": result.get("metadata", {}),
                "score": result.get("score", 0.0)
            })
        
        return formatted_results
    except Exception as e:
        logger.error(f"Error searching patterns: {e}")
        return [{"error": str(e)}]


def get_movement_history(container_id: str) -> List[Dict[str, Any]]:
    """
    Get raw movement history for a container from SQLite.
    
    Args:
        container_id: Container ID or container number
    
    Returns:
        List of dictionaries with movement event details ordered by sequence
    """
    try:
        # First try to find by container_id, then by container_number
        query = """
        SELECT * FROM containers
        WHERE container_id = ? OR container_number = ?
        ORDER BY event_sequence_number ASC, actual_timestamp ASC
        """
        
        results = sqlite_client.execute_query(query, (container_id, container_id))
        
        if not results:
            return [{"error": f"Container {container_id} not found in movement history"}]
        
        # Format results
        formatted_results = []
        for result in results:
            formatted_results.append({
                "event_sequence_number": result.get("event_sequence_number"),
                "movement_id": result.get("movement_id"),
                "event_type": result.get("event_type"),
                "movement_type": result.get("movement_type"),
                "from_location": {
                    "type": result.get("from_location_type"),
                    "id": result.get("from_location_id")
                },
                "to_location": {
                    "type": result.get("to_location_type"),
                    "id": result.get("to_location_id"),
                    "block_id": result.get("block_id"),
                    "bay": result.get("bay"),
                    "row": result.get("row"),
                    "tier": result.get("tier")
                },
                "planned_timestamp": result.get("planned_timestamp"),
                "actual_timestamp": result.get("actual_timestamp"),
                "delay_minutes": result.get("delay_minutes"),
                "equipment_type": result.get("equipment_type"),
                "rehandle_flag": result.get("rehandle_flag"),
                "optimality_tag": result.get("optimality_tag"),
                "exception_flag": result.get("exception_flag"),
                "exception_reason": result.get("exception_reason")
            })
        
        return formatted_results
    except Exception as e:
        logger.error(f"Error getting movement history: {e}")
        return [{"error": str(e)}]


def get_vessel_plan(vessel_id: str) -> Dict[str, Any]:
    """
    Get vessel schedule and stowage requirements from SQLite.
    
    Args:
        vessel_id: Vessel ID to look up
    
    Returns:
        Dictionary with vessel information, assigned containers, and schedule details
    """
    try:
        # Get vessel information from Neo4j
        vessel_query = """
        MATCH (v:Vessel {vesselId: $vessel_id})
        OPTIONAL MATCH (c:Container)-[:ASSIGNED_TO]->(v)
        RETURN v,
               collect(DISTINCT {
                   containerId: c.containerId,
                   containerNumber: c.containerNumber,
                   containerType: c.containerType,
                   pod: c.pod,
                   weightClass: c.weightClass
               }) as containers
        LIMIT 1
        """
        
        vessel_results = neo4j_client.execute_query(vessel_query, {"vessel_id": vessel_id})
        
        if not vessel_results:
            return {"error": f"Vessel {vessel_id} not found"}
        
        result = vessel_results[0]
        vessel = result.get("v", {})
        containers = result.get("containers", [])
        
        # Get additional details from SQLite if available
        sqlite_query = """
        SELECT DISTINCT 
            vessel_id,
            voyage_id,
            pod,
            cutoff_datetime,
            COUNT(*) as container_count,
            COUNT(DISTINCT pod) as unique_pods
        FROM containers
        WHERE vessel_id = ?
        GROUP BY vessel_id, voyage_id, pod, cutoff_datetime
        """
        
        sqlite_results = sqlite_client.execute_query(sqlite_query, (vessel_id,))
        
        return {
            "vessel_id": vessel.get("vesselId"),
            "voyage_number": vessel.get("voyageNumber"),
            "pod": vessel.get("pod"),
            "cutoff_datetime": vessel.get("cutoffDatetime"),
            "container_count": len(containers),
            "containers": containers,
            "sqlite_details": sqlite_results[0] if sqlite_results else None
        }
    except Exception as e:
        logger.error(f"Error getting vessel plan: {e}")
        return {"error": str(e)}


def suggest_placement(container_id: str, container_props: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Hybrid tool that combines all three databases to recommend optimal slot placement.
    
    Args:
        container_id: Container ID or container number
        container_props: Optional dictionary with container properties (type, weight_class, pod, hazmat_flag, etc.)
    
    Returns:
        Dictionary with placement recommendations, reasoning, and rule compliance
    """
    try:
        # Get container information
        container_info = find_container(container_id)
        if "error" in container_info:
            return {"error": container_info["error"]}
        
        # Use container_props if provided, otherwise use from container_info
        props = container_props or {}
        container_type = props.get("container_type") or container_info.get("container_type")
        weight_class = props.get("weight_class") or container_info.get("weight_class")
        pod = props.get("pod") or container_info.get("pod")
        hazmat_flag = props.get("hazmat_flag") or container_info.get("hazmat_flag", False)
        reefer_flag = props.get("reefer_flag", False)
        
        # Search relevant rules
        rule_query = f"stacking rules for {container_type} containers"
        if hazmat_flag:
            rule_query += " with hazmat"
        if reefer_flag:
            rule_query += " reefer"
        if weight_class:
            rule_query += f" {weight_class} weight"
        
        rules = search_rules(rule_query, top_k=5)
        
        # Search similar historical patterns
        pattern_query = f"placement pattern for {container_type} container"
        if pod:
            pattern_query += f" to {pod}"
        patterns = search_patterns(pattern_query, top_k=3)
        
        # Find available slots
        zone_type = "Export" if container_info.get("type") == "export_container" else "Import"
        available_slots_query = """
        MATCH (s:Slot)
        WHERE s.isOccupied = false
          AND s.zoneType = $zone_type
        OPTIONAL MATCH (s)-[:BELONGS_TO_BLOCK]->(b:Block)
        RETURN s,
               b,
               CASE 
                 WHEN b.blockType = 'Hazmat' AND $hazmat_flag = true THEN 100
                 WHEN b.blockType = 'Reefer' AND $reefer_flag = true THEN 100
                 WHEN b.blockType = 'General' AND $hazmat_flag = false AND $reefer_flag = false THEN 100
                 ELSE 0
               END as compatibility_score
        ORDER BY compatibility_score DESC, s.tier ASC
        LIMIT 10
        """
        
        available_slots = neo4j_client.execute_query(available_slots_query, {
            "zone_type": zone_type,
            "hazmat_flag": hazmat_flag,
            "reefer_flag": reefer_flag
        })
        
        # Get yard state for context
        yard_state = query_yard_state(zone_type)
        
        # Build recommendations
        recommendations = []
        for idx, slot in enumerate(available_slots[:5]):  # Top 5 recommendations
            slot_data = slot.get("s", {})
            block_data = slot.get("b", {})
            
            recommendations.append({
                "rank": idx + 1,
                "slot_id": slot_data.get("slotId"),
                "block_id": slot_data.get("blockId"),
                "yard_name": slot_data.get("yardName"),
                "bay": slot_data.get("bay"),
                "row": slot_data.get("row"),
                "tier": slot_data.get("tier"),
                "compatibility_score": slot.get("compatibility_score", 0),
                "block_type": block_data.get("blockType"),
                "reasons": [
                    f"Compatible block type: {block_data.get('blockType')}",
                    f"Zone type matches: {zone_type}",
                    f"Slot is available (tier {slot_data.get('tier')})"
                ]
            })
        
        return {
            "container_id": container_id,
            "container_info": container_info,
            "recommendations": recommendations,
            "applicable_rules": rules,
            "similar_patterns": patterns,
            "yard_state": yard_state,
            "reasoning": {
                "zone_selected": zone_type,
                "rules_applied": len(rules),
                "patterns_found": len(patterns),
                "available_slots": len(available_slots)
            }
        }
    except Exception as e:
        logger.error(f"Error suggesting placement: {e}")
        return {"error": str(e)}


# Create LangChain tools
yard_state_tool = StructuredTool.from_function(
    func=query_yard_state,
    name="query_yard_state",
    description="Query the current yard state including container positions and occupancy by zone. Use this to check yard utilization, available slots, and container distribution."
)

find_container_tool = StructuredTool.from_function(
    func=find_container,
    name="find_container",
    description="Find a container by ID or container number. Returns current location, status, blocking containers, and vessel assignment."
)

blocking_analysis_tool = StructuredTool.from_function(
    func=get_blocking_analysis,
    name="get_blocking_analysis",
    description="Get a list of containers that need to be moved before accessing a target container. Returns blocking containers in move order."
)

search_rules_tool = StructuredTool.from_function(
    func=search_rules,
    name="search_rules",
    description="Search yard stacking rules using semantic search. Use this to find rules about hazmat, weight, size compatibility, safety, and operational constraints."
)

search_patterns_tool = StructuredTool.from_function(
    func=search_patterns,
    name="search_patterns",
    description="Search historical container movement patterns. Use this to find similar past scenarios and learn from historical decisions."
)

movement_history_tool = StructuredTool.from_function(
    func=get_movement_history,
    name="get_movement_history",
    description="Get raw movement history for a container from the audit log. Returns all events including gate in, yard moves, rehandles, and vessel load/unload."
)

vessel_plan_tool = StructuredTool.from_function(
    func=get_vessel_plan,
    name="get_vessel_plan",
    description="Get vessel schedule and stowage requirements. Returns vessel information, assigned containers, POD distribution, and cutoff times."
)

suggest_placement_tool = StructuredTool.from_function(
    func=suggest_placement,
    name="suggest_placement",
    description="Hybrid tool that combines rules, patterns, and yard state to recommend optimal slot placement for a container. This is the main optimization tool."
)


# List of all available tools
ALL_TOOLS = [
    yard_state_tool,
    find_container_tool,
    blocking_analysis_tool,
    search_rules_tool,
    search_patterns_tool,
    movement_history_tool,
    vessel_plan_tool,
    suggest_placement_tool
]

