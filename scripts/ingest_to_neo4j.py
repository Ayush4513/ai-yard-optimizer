"""Ingest container, location, and vessel data from SQLite to Neo4j graph database."""
import sys
from pathlib import Path
import logging
from typing import Dict, List, Optional

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.database.sqlite_client import sqlite_client
from src.database.neo4j_client import neo4j_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_slot_id(block_id: str, bay: int, row: int, tier: int) -> str:
    """Generate a unique slot ID from location components."""
    return f"{block_id}-{bay:02d}-{row:02d}-{tier:02d}"


def ingest_yards():
    """Ingest yard data from SQLite to Neo4j."""
    logger.info("Ingesting yards...")
    
    try:
        # Check if yards table exists
        tables = sqlite_client.get_table_names()
        if "yards" not in tables:
            logger.warning("⚠️  'yards' table not found in SQLite, skipping...")
            return 0
        
        yards = sqlite_client.query_table("yards")
        logger.info(f"Found {len(yards)} yards in SQLite")
        
        with neo4j_client.get_session() as session:
            for yard in yards:
                query = """
                MERGE (y:Yard {yardId: $yard_id})
                SET y.yardName = $yard_name,
                    y.yardType = $yard_type
                """
                session.run(query, {
                    "yard_id": yard.get("yard_id"),
                    "yard_name": yard.get("yard_name"),
                    "yard_type": yard.get("yard_type")
                })
        
        logger.info(f"✅ Ingested {len(yards)} yards")
        return len(yards)
    except Exception as e:
        logger.error(f"❌ Error ingesting yards: {e}")
        return 0


def ingest_blocks():
    """Ingest block data from SQLite to Neo4j."""
    logger.info("Ingesting blocks...")
    
    try:
        # Check if blocks table exists
        tables = sqlite_client.get_table_names()
        if "blocks" not in tables:
            logger.warning("⚠️  'blocks' table not found in SQLite, skipping...")
            return 0
        
        blocks = sqlite_client.query_table("blocks")
        logger.info(f"Found {len(blocks)} blocks in SQLite")
        
        with neo4j_client.get_session() as session:
            for block in blocks:
                # Create/update block node
                block_query = """
                MERGE (b:Block {blockId: $block_id})
                SET b.blockName = $block_name,
                    b.yardName = $yard_name,
                    b.blockType = $block_type,
                    b.positionX = $position_x,
                    b.positionY = $position_y,
                    b.totalSlots = $total_slots,
                    b.occupiedSlots = $occupied_slots
                """
                session.run(block_query, {
                    "block_id": block.get("block_id"),
                    "block_name": block.get("block_name"),
                    "yard_name": block.get("yard_name"),
                    "block_type": block.get("block_type"),
                    "position_x": block.get("position_x"),
                    "position_y": block.get("position_y"),
                    "total_slots": block.get("total_slots"),
                    "occupied_slots": block.get("occupied_slots", 0)
                })
                
                # Link block to yard
                yard_query = """
                MATCH (b:Block {blockId: $block_id})
                MATCH (y:Yard {yardName: $yard_name})
                MERGE (b)-[:BELONGS_TO_YARD]->(y)
                """
                session.run(yard_query, {
                    "block_id": block.get("block_id"),
                    "yard_name": block.get("yard_name")
                })
        
        logger.info(f"✅ Ingested {len(blocks)} blocks")
        return len(blocks)
    except Exception as e:
        logger.error(f"❌ Error ingesting blocks: {e}")
        return 0


def ingest_slots():
    """Ingest yard location (slot) data from SQLite to Neo4j."""
    logger.info("Ingesting slots (yard locations)...")
    
    try:
        # Check if yard_locations table exists
        tables = sqlite_client.get_table_names()
        if "yard_locations" not in tables:
            logger.warning("⚠️  'yard_locations' table not found in SQLite, skipping...")
            return 0
        
        locations = sqlite_client.query_table("yard_locations")
        logger.info(f"Found {len(locations)} locations in SQLite")
        
        with neo4j_client.get_session() as session:
            for location in locations:
                slot_id = create_slot_id(
                    location.get("block_id", ""),
                    location.get("bay", 0),
                    location.get("row", 0),
                    location.get("tier", 0)
                )
                
                # Determine zone type from yard name or block type
                yard_name = location.get("yard_name", "")
                zone_type = "Export" if "Export" in yard_name else "Import" if "Import" in yard_name else "General"
                
                # Create/update slot node
                slot_query = """
                MERGE (s:Slot {slotId: $slot_id})
                SET s.blockId = $block_id,
                    s.yardName = $yard_name,
                    s.bay = $bay,
                    s.row = $row,
                    s.tier = $tier,
                    s.zoneType = $zone_type,
                    s.isOccupied = $occupied,
                    s.status = $status
                """
                session.run(slot_query, {
                    "slot_id": slot_id,
                    "block_id": location.get("block_id"),
                    "yard_name": yard_name,
                    "bay": location.get("bay"),
                    "row": location.get("row"),
                    "tier": location.get("tier"),
                    "zone_type": zone_type,
                    "occupied": location.get("occupied", False),
                    "status": location.get("status")
                })
                
                # Link slot to block
                block_query = """
                MATCH (s:Slot {slotId: $slot_id})
                MATCH (b:Block {blockId: $block_id})
                MERGE (s)-[:BELONGS_TO_BLOCK]->(b)
                """
                session.run(block_query, {
                    "slot_id": slot_id,
                    "block_id": location.get("block_id")
                })
        
        logger.info(f"✅ Ingested {len(locations)} slots")
        return len(locations)
    except Exception as e:
        logger.error(f"❌ Error ingesting slots: {e}")
        return 0


def ingest_vessels():
    """Extract and ingest unique vessels from container data."""
    logger.info("Ingesting vessels...")
    
    try:
        # Get unique vessel-voyage combinations from containers
        query = """
        SELECT DISTINCT vessel_id, voyage_id, pod, cutoff_datetime
        FROM containers
        WHERE vessel_id IS NOT NULL AND vessel_id != ''
        """
        vessel_data = sqlite_client.execute_query(query)
        logger.info(f"Found {len(vessel_data)} unique vessel-voyage combinations")
        
        with neo4j_client.get_session() as session:
            for vessel_info in vessel_data:
                vessel_id = vessel_info.get("vessel_id")
                if not vessel_id:
                    continue
                
                # Create/update vessel node
                vessel_query = """
                MERGE (v:Vessel {vesselId: $vessel_id})
                SET v.voyageNumber = $voyage_id,
                    v.pod = $pod,
                    v.cutoffDatetime = $cutoff_datetime
                """
                session.run(vessel_query, {
                    "vessel_id": vessel_id,
                    "voyage_id": vessel_info.get("voyage_id"),
                    "pod": vessel_info.get("pod"),
                    "cutoff_datetime": vessel_info.get("cutoff_datetime")
                })
        
        logger.info(f"✅ Ingested {len(vessel_data)} vessels")
        return len(vessel_data)
    except Exception as e:
        logger.error(f"❌ Error ingesting vessels: {e}")
        return 0


def ingest_containers():
    """Ingest container data from SQLite to Neo4j with relationships."""
    logger.info("Ingesting containers...")
    
    try:
        # Check if containers table exists
        tables = sqlite_client.get_table_names()
        if "containers" not in tables:
            logger.error("❌ 'containers' table not found in SQLite!")
            return 0
        
        # Get all containers (limit for testing, remove limit for full ingestion)
        containers = sqlite_client.query_table("containers", limit=None)
        logger.info(f"Found {len(containers)} containers in SQLite")
        
        with neo4j_client.get_session() as session:
            for idx, container in enumerate(containers):
                if idx % 100 == 0:
                    logger.info(f"Processing container {idx + 1}/{len(containers)}...")
                
                container_id = container.get("container_id")
                container_number = container.get("container_number")
                
                if not container_id:
                    continue
                
                # Create/update container node
                container_query = """
                MERGE (c:Container {containerId: $container_id})
                SET c.containerNumber = $container_number,
                    c.isoCode = $iso_code,
                    c.sizeTeu = $size_teu,
                    c.containerType = $container_type,
                    c.loadStatus = $load_status,
                    c.weightMt = $weight_mt,
                    c.weightClass = $weight_class,
                    c.cargoDescription = $cargo_description,
                    c.type = $type,
                    c.customsStatus = $customs_status,
                    c.shippingLine = $shipping_line,
                    c.consignee = $consignee,
                    c.pod = $pod,
                    c.podPriority = $pod_priority,
                    c.hazmatFlag = $hazmat_flag,
                    c.imdgClass = $imdg_class,
                    c.unNumber = $un_number,
                    c.reeferFlag = $reefer_flag,
                    c.setTemperature = $set_temperature,
                    c.blockId = $block_id,
                    c.bay = $bay,
                    c.row = $row,
                    c.tier = $tier,
                    c.gateInTime = $gate_in_time,
                    c.expectedPickupTime = $expected_pickup_time,
                    c.dwellTimeHours = $dwell_time_hours,
                    c.status = COALESCE($status, 'In Yard')
                """
                
                session.run(container_query, {
                    "container_id": container_id,
                    "container_number": container_number,
                    "iso_code": container.get("iso_code"),
                    "size_teu": container.get("size_teu"),
                    "container_type": container.get("container_type"),
                    "load_status": container.get("load_status"),
                    "weight_mt": container.get("weight_mt"),
                    "weight_class": container.get("weight_class"),
                    "cargo_description": container.get("cargo_description"),
                    "type": container.get("type"),
                    "customs_status": container.get("customs_status"),
                    "shipping_line": container.get("shipping_line"),
                    "consignee": container.get("consignee"),
                    "pod": container.get("pod"),
                    "pod_priority": container.get("pod_priority"),
                    "hazmat_flag": container.get("hazmat_flag", False),
                    "imdg_class": container.get("imdg_class"),
                    "un_number": container.get("un_number"),
                    "reefer_flag": container.get("reefer_flag", False),
                    "set_temperature": container.get("set_temperature"),
                    "block_id": container.get("block_id"),
                    "bay": container.get("bay"),
                    "row": container.get("row"),
                    "tier": container.get("tier"),
                    "gate_in_time": container.get("gate_in_time"),
                    "expected_pickup_time": container.get("expected_pickup_time"),
                    "dwell_time_hours": container.get("dwell_time_hours"),
                    "status": container.get("container_status_after_event") or container.get("customs_status")
                })
                
                # Create LOCATED_AT relationship to Slot
                if container.get("block_id") and container.get("bay") is not None:
                    slot_id = create_slot_id(
                        container.get("block_id", ""),
                        container.get("bay", 0),
                        container.get("row", 0),
                        container.get("tier", 0)
                    )
                    
                    location_query = """
                    MATCH (c:Container {containerId: $container_id})
                    MATCH (s:Slot {slotId: $slot_id})
                    MERGE (c)-[:LOCATED_AT]->(s)
                    """
                    session.run(location_query, {
                        "container_id": container_id,
                        "slot_id": slot_id
                    })
                
                # Create ASSIGNED_TO relationship to Vessel
                vessel_id = container.get("vessel_id")
                if vessel_id:
                    vessel_query = """
                    MATCH (c:Container {containerId: $container_id})
                    MATCH (v:Vessel {vesselId: $vessel_id})
                    MERGE (c)-[:ASSIGNED_TO]->(v)
                    """
                    session.run(vessel_query, {
                        "container_id": container_id,
                        "vessel_id": vessel_id
                    })
                
                # Create STACKED_ON relationship (containers stacked on top of this one)
                # A container is stacked on another if they're in the same bay/row but this one is at a higher tier
                if container.get("block_id") and container.get("bay") is not None and container.get("tier", 0) > 1:
                    stacked_query = """
                    MATCH (c:Container {containerId: $container_id})
                    MATCH (below:Container)
                    WHERE below.blockId = $block_id
                      AND below.bay = $bay
                      AND below.row = $row
                      AND below.tier = $tier_below
                      AND below.containerId <> $container_id
                    MERGE (c)-[:STACKED_ON]->(below)
                    """
                    session.run(stacked_query, {
                        "container_id": container_id,
                        "block_id": container.get("block_id"),
                        "bay": container.get("bay"),
                        "row": container.get("row"),
                        "tier_below": container.get("tier", 0) - 1
                    })
        
        logger.info(f"✅ Ingested {len(containers)} containers")
        return len(containers)
    except Exception as e:
        logger.error(f"❌ Error ingesting containers: {e}")
        import traceback
        traceback.print_exc()
        return 0


def create_blocking_relationships():
    """Create BLOCKS relationships - containers that block access to other containers."""
    logger.info("Creating blocking relationships...")
    
    try:
        with neo4j_client.get_session() as session:
            # A container blocks another if it's stacked on top of it
            blocking_query = """
            MATCH (upper:Container)-[:STACKED_ON]->(lower:Container)
            MERGE (upper)-[:BLOCKS]->(lower)
            """
            result = session.run(blocking_query)
            summary = result.consume()
            
            logger.info(f"✅ Created {summary.counters.relationships_created} blocking relationships")
            return summary.counters.relationships_created
    except Exception as e:
        logger.error(f"❌ Error creating blocking relationships: {e}")
        return 0


def main():
    """Main ingestion function."""
    logger.info("=" * 60)
    logger.info("SQLite to Neo4j Data Ingestion")
    logger.info("=" * 60)
    
    # Connect to databases
    logger.info("\n1. Connecting to databases...")
    if not sqlite_client.connect():
        logger.error("❌ Failed to connect to SQLite")
        return
    
    if not neo4j_client.connect():
        logger.error("❌ Failed to connect to Neo4j")
        return
    
    # Initialize Neo4j schema
    logger.info("\n2. Initializing Neo4j schema...")
    neo4j_client.initialize_schema()
    
    # Ingest data in order (dependencies first)
    logger.info("\n3. Starting data ingestion...")
    results = {
        "Yards": ingest_yards(),
        "Blocks": ingest_blocks(),
        "Slots": ingest_slots(),
        "Vessels": ingest_vessels(),
        "Containers": ingest_containers(),
        "Blocking Relationships": create_blocking_relationships()
    }
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("Ingestion Summary")
    logger.info("=" * 60)
    for component, count in results.items():
        logger.info(f"✅ {component}: {count}")
    
    total = sum(results.values())
    logger.info(f"\n🎉 Total nodes/relationships created: {total}")
    
    # Close connections
    sqlite_client.close()
    neo4j_client.close()


if __name__ == "__main__":
    main()

