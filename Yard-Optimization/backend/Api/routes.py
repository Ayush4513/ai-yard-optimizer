"""
EXTENDED API ENDPOINTS

These endpoints handle container placement, yard management, and workflow operations.
They are registered via the APIRouter and included in the main FastAPI app.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from Database import models, schemas
from Database.database import get_db
from datetime import datetime
from config import USE_V2_TABLES, get_yards_table, get_blocks_table, get_locations_table, get_containers_table

router = APIRouter()


# ============================================================================
# CONTAINER PLACEMENT WORKFLOW ENDPOINTS
# ============================================================================

@router.post("/containers/{container_id}/assign-location")
def assign_container_to_location(
    container_id: str,
    location_id: str,
    db: Session = Depends(get_db)
):
    """
    Assign a container to a specific yard location.
    Uses v2 tables if USE_V2_TABLES is True.
    """
    containers_table = get_containers_table()
    locations_table = get_locations_table()
    blocks_table = get_blocks_table()

    # Get container
    container = db.execute(text(f"""
        SELECT container_id, container_number FROM {containers_table}
        WHERE container_id = :container_id
    """), {"container_id": container_id}).fetchone()

    if not container:
        raise HTTPException(status_code=404, detail="Container not found")

    # Get location
    location = db.execute(text(f"""
        SELECT location_id, yard_name, block_id, bay, row, tier, occupied
        FROM {locations_table}
        WHERE location_id = :location_id
    """), {"location_id": location_id}).fetchone()

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    loc_id, yard_name, block_id, bay, row_num, tier, occupied = location

    # Check if location is occupied
    if occupied:
        raise HTTPException(
            status_code=400,
            detail=f"Location {location_id} is already occupied"
        )

    # Update container location
    db.execute(text(f"""
        UPDATE {containers_table}
        SET current_location_id = :location_id,
            block_id = :block_id,
            bay = :bay,
            row = :row,
            tier = :tier
        WHERE container_id = :container_id
    """), {
        "location_id": location_id,
        "block_id": block_id,
        "bay": bay,
        "row": row_num,
        "tier": tier,
        "container_id": container_id
    })

    # Update location status
    db.execute(text(f"""
        UPDATE {locations_table}
        SET occupied = 1, container_id = :container_id, status = 'actual'
        WHERE location_id = :location_id
    """), {"container_id": container_id, "location_id": location_id})

    # Update block occupancy
    db.execute(text(f"""
        UPDATE {blocks_table}
        SET occupied_slots = occupied_slots + 1
        WHERE block_id = :block_id
    """), {"block_id": block_id})

    db.commit()

    return {
        "message": "Container assigned successfully",
        "container_id": container_id,
        "location_id": location_id,
        "location_details": {
            "yard": yard_name,
            "block": block_id,
            "bay": bay,
            "row": row_num,
            "tier": tier
        }
    }


@router.delete("/containers/{container_id}/remove-from-location")
def remove_container_from_location(
    container_id: str,
    db: Session = Depends(get_db)
):
    """
    Remove a container from its current location (gate out / pickup).
    Uses v2 tables if USE_V2_TABLES is True.
    """
    containers_table = get_containers_table()
    locations_table = get_locations_table()
    blocks_table = get_blocks_table()

    # Get container
    container = db.execute(text(f"""
        SELECT container_id, current_location_id, block_id
        FROM {containers_table}
        WHERE container_id = :container_id
    """), {"container_id": container_id}).fetchone()

    if not container:
        raise HTTPException(status_code=404, detail="Container not found")

    _, current_location_id, block_id = container

    if not current_location_id:
        raise HTTPException(
            status_code=400,
            detail="Container is not currently assigned to any location"
        )

    # Free up the location
    db.execute(text(f"""
        UPDATE {locations_table}
        SET occupied = 0, container_id = NULL, status = NULL
        WHERE location_id = :location_id
    """), {"location_id": current_location_id})

    # Update block occupancy
    if block_id:
        db.execute(text(f"""
            UPDATE {blocks_table}
            SET occupied_slots = MAX(0, occupied_slots - 1)
            WHERE block_id = :block_id
        """), {"block_id": block_id})

    # Clear container location
    db.execute(text(f"""
        UPDATE {containers_table}
        SET current_location_id = NULL, block_id = NULL, bay = NULL, row = NULL, tier = NULL
        WHERE container_id = :container_id
    """), {"container_id": container_id})

    db.commit()

    return {
        "message": "Container removed from location",
        "container_id": container_id,
        "previous_location": current_location_id
    }


# ============================================================================
# BATCH OPERATIONS
# ============================================================================

@router.post("/containers/batch")
def create_containers_batch(
    containers: List[schemas.ContainerCreate],
    db: Session = Depends(get_db)
):
    """
    Create multiple containers at once
    """
    created = []
    errors = []

    for container_data in containers:
        try:
            # Check if exists
            existing = db.query(models.Container).filter(
                models.Container.container_number == container_data.container_number
            ).first()

            if existing:
                errors.append({
                    "container_number": container_data.container_number,
                    "error": "Already exists"
                })
                continue

            db_container = models.Container(**container_data.dict())
            db.add(db_container)
            created.append(container_data.container_number)
        except Exception as e:
            errors.append({
                "container_number": container_data.container_number,
                "error": str(e)
            })

    db.commit()

    return {
        "created": len(created),
        "failed": len(errors),
        "created_containers": created,
        "errors": errors
    }


# ============================================================================
# SEARCH & FILTER ENDPOINTS
# ============================================================================

@router.get("/containers/search")
def search_containers(
    q: str = None,  # Search query
    container_number: str = None,
    shipping_line: str = None,
    pod: str = None,
    customs_status: str = None,
    container_type: str = None,
    yard_name: str = None,
    block_id: str = None,
    has_location: bool = None,
    skip: int = 0,
    limit: int = 5000,
    db: Session = Depends(get_db)
):
    """
    Advanced container search with multiple filters and pagination.
    - skip: Number of records to skip (default: 0)
    - limit: Maximum records to return (default: 5000, max: 50000)
    """
    # Cap limit - increased for large dataset viewing
    limit = min(limit, 50000)

    query = db.query(models.Container)

    if q:
        # Search in container number or cargo description
        query = query.filter(
            (models.Container.container_number.contains(q)) |
            (models.Container.cargo_description.contains(q))
        )

    if container_number:
        query = query.filter(models.Container.container_number.contains(container_number))

    if shipping_line:
        query = query.filter(models.Container.shipping_line == shipping_line)

    if pod:
        query = query.filter(models.Container.pod == pod)

    if customs_status:
        query = query.filter(models.Container.customs_status == customs_status)

    if container_type:
        query = query.filter(models.Container.container_type == container_type)

    if block_id:
        query = query.filter(models.Container.block_id == block_id)

    if has_location is not None:
        if has_location:
            query = query.filter(models.Container.current_location_id.isnot(None))
        else:
            query = query.filter(models.Container.current_location_id.is_(None))

    # Get total count for pagination metadata
    total = query.count()

    containers = query.offset(skip).limit(limit).all()

    # Convert to dict format
    all_columns = [col.name for col in models.Container.__table__.columns]
    containers_list = [
        {col_name: getattr(c, col_name) for col_name in all_columns}
        for c in containers
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


# ============================================================================
# YARD & BLOCK ENDPOINTS (for dynamic UI)
# ============================================================================

@router.get("/yards")
def get_all_yards(db: Session = Depends(get_db)):
    """
    List all yards
    """
    yards_table = get_yards_table()
    yards = db.execute(text(f"SELECT yard_id, yard_name, yard_type FROM {yards_table}")).fetchall()
    return [
        {
            "yard_id": y[0],
            "yard_name": y[1],
            "yard_type": y[2],
        }
        for y in yards
    ]


@router.get("/yards/overview")
def get_yard_overview(db: Session = Depends(get_db)):
    """
    Full yard hierarchy grouped by yard_type.
    Each yard includes its blocks with occupancy stats (no locations).
    Used by the Yard Overview screen.
    Uses v2 tables if USE_V2_TABLES is True.
    """
    yards_table = get_yards_table()
    blocks_table = get_blocks_table()
    locations_table = get_locations_table()

    # Get yards
    yards = db.execute(text(f"SELECT yard_id, yard_name, yard_type FROM {yards_table}")).fetchall()

    # Pre-compute occupied counts per block in a single query
    occupancy_rows = db.execute(text(f"""
        SELECT block_id, SUM(CASE WHEN occupied = 1 THEN 1 ELSE 0 END) as occupied_count
        FROM {locations_table}
        GROUP BY block_id
    """)).fetchall()
    occupancy_map = {row[0]: int(row[1]) for row in occupancy_rows}

    result = {"sea_side": [], "land_side": [], "oog": []}

    for yard in yards:
        yard_id, yard_name, yard_type = yard

        # Get blocks for this yard
        blocks = db.execute(text(f"""
            SELECT block_id, yard_name, block_name, block_type, position_x, position_y,
                   total_slots, occupied_slots, bays, rows, max_tier,
                   reefer_plugs, hazmat_certified, empty_storage, primary_use
            FROM {blocks_table}
            WHERE yard_id = :yard_id
            ORDER BY block_number
        """), {"yard_id": yard_id}).fetchall()

        block_list = []
        for block in blocks:
            occupied = occupancy_map.get(block[0], 0)
            block_list.append({
                "block_id": block[0],
                "yard_name": block[1],
                "block_name": block[2],
                "block_type": block[3],
                "position": {"x": block[4] or 0, "y": block[5] or 0},
                "total_slots": block[6],
                "occupied_slots": occupied,
                "bays": block[8],
                "rows": block[9],
                "max_tier": block[10],
                "reefer_plugs": block[11],
                "hazmat_certified": block[12],
                "empty_storage": block[13],
                "primary_use": block[14],
            })

        yard_data = {
            "yard_id": yard_id,
            "yard_name": yard_id,  # Use short name (SS1, LS1, OOG) for UI display
            "yard_type": yard_type,
            "blocks": block_list,
        }

        if yard_type == "Sea-Side":
            result["sea_side"].append(yard_data)
        elif yard_type == "Land-Side":
            result["land_side"].append(yard_data)
        elif yard_type == "OOG":
            result["oog"].append(yard_data)

    return result


@router.get("/blocks")
def get_all_blocks(db: Session = Depends(get_db)):
    """
    List all blocks
    """
    blocks_table = get_blocks_table()
    blocks = db.execute(text(f"""
        SELECT * FROM {blocks_table}
        ORDER BY yard_name, block_number
    """)).fetchall()

    # Get column names dynamically
    col_names = db.execute(text(f"PRAGMA table_info({blocks_table})")).fetchall()
    columns = [col[1] for col in col_names]

    return [
        {columns[i]: block[i] for i in range(len(columns))}
        for block in blocks
    ]


@router.get("/blocks/{block_id}/details")
def get_block_details(block_id: str, db: Session = Depends(get_db)):
    """
    Returns a block with ONLY occupied locations (sparse data approach).
    Frontend generates the full grid and overlays occupied slots.
    This reduces payload from 560 items to only occupied count (typically <50).
    Uses v2 tables if USE_V2_TABLES is True.
    """
    blocks_table = get_blocks_table()
    locations_table = get_locations_table()
    containers_table = get_containers_table()

    block = db.execute(text(f"""
        SELECT block_id, yard_name, block_name, block_type, total_slots,
               occupied_slots, bays, rows, max_tier, reefer_plugs,
               hazmat_certified, primary_use
        FROM {blocks_table}
        WHERE block_id = :block_id
    """), {"block_id": block_id}).fetchone()

    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    # Only fetch occupied locations (sparse data)
    occupied_locations = db.execute(text(f"""
        SELECT location_id, bay, row, tier, status, container_id
        FROM {locations_table}
        WHERE block_id = :block_id AND occupied = 1
    """), {"block_id": block_id}).fetchall()

    # Get containers for occupied locations in a single query
    occupied_container_ids = [loc[5] for loc in occupied_locations if loc[5]]
    containers_map = {}
    if occupied_container_ids:
        placeholders = ",".join([f"'{cid}'" for cid in occupied_container_ids])
        containers = db.execute(text(f"""
            SELECT container_id, container_number, container_type, type,
                   load_status, weight_mt, weight_class, shipping_line,
                   pod, consignee, size_teu, hazmat_flag, reefer_flag
            FROM {containers_table}
            WHERE container_id IN ({placeholders})
        """)).fetchall()
        for c in containers:
            containers_map[c[0]] = {
                "container_id": c[0],
                "container_number": c[1],
                "container_type": c[2],
                "type": c[3],
                "load_status": c[4],
                "weight_mt": c[5],
                "weight_class": c[6],
                "shipping_line": c[7],
                "pod": c[8],
                "consignee": c[9],
                "size_teu": c[10],
                "hazmat_flag": c[11],
                "reefer_flag": c[12],
            }

    # Build sparse location list (only occupied)
    occupied_list = []
    for loc in occupied_locations:
        occupied_list.append({
            "location_id": loc[0],
            "bay": loc[1],
            "row": loc[2],
            "tier": loc[3],
            "status": loc[4],
            "container": containers_map.get(loc[5]),
        })

    return {
        "block_id": block[0],
        "yard_name": block[1],
        "block_name": block[2],
        "block_type": block[3],
        "total_slots": block[4],
        "occupied_slots": len(occupied_locations),
        "bays": block[6] or 20,
        "rows": block[7] or 7,
        "max_tier": block[8] or 4,
        "reefer_plugs": block[9],
        "hazmat_certified": block[10],
        "primary_use": block[11],
        "occupied_locations": occupied_list,
    }


# Keep original block details endpoint for reference (ORM version)
@router.get("/blocks/{block_id}/details-original")
def get_block_details_original(block_id: str, db: Session = Depends(get_db)):
    """
    Original block details endpoint using ORM (always uses original tables).
    """
    block = db.query(models.Block).filter(
        models.Block.block_id == block_id
    ).first()

    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    # Only fetch occupied locations (sparse data)
    occupied_locations = db.query(models.YardLocation).filter(
        models.YardLocation.block_id == block_id,
        models.YardLocation.occupied == True
    ).all()

    # Get containers for occupied locations in a single query
    occupied_container_ids = [
        loc.container_id for loc in occupied_locations
        if loc.container_id
    ]
    containers_map = {}
    if occupied_container_ids:
        containers = db.query(models.Container).filter(
            models.Container.container_id.in_(occupied_container_ids)
        ).all()
        # Only include essential container fields for UI
        for c in containers:
            containers_map[c.container_id] = {
                "container_id": c.container_id,
                "container_number": c.container_number,
                "container_type": c.container_type,
                "type": c.type,
                "load_status": c.load_status,
                "weight_mt": c.weight_mt,
                "weight_class": c.weight_class,
                "shipping_line": c.shipping_line,
                "pod": c.pod,
                "consignee": c.consignee,
                "size_teu": c.size_teu,
                "hazmat_flag": c.hazmat_flag,
                "reefer_flag": c.reefer_flag,
            }

    # Build sparse location list (only occupied)
    occupied_list = []
    for loc in occupied_locations:
        occupied_list.append({
            "location_id": loc.location_id,
            "bay": loc.bay,
            "row": loc.row,
            "tier": loc.tier,
            "status": loc.status,
            "container": containers_map.get(loc.container_id),
        })

    return {
        "block_id": block.block_id,
        "yard_name": block.yard_name,
        "block_name": block.block_name,
        "block_type": block.block_type,
        "total_slots": block.total_slots,
        "occupied_slots": len(occupied_locations),
        "bays": block.bays or 20,
        "rows": block.rows or 7,
        "max_tier": block.max_tier or 4,
        "reefer_plugs": block.reefer_plugs,
        "hazmat_certified": block.hazmat_certified,
        "primary_use": block.primary_use,
        "occupied_locations": occupied_list,
    }


# ============================================================================
# YARD OCCUPANCY
# ============================================================================

@router.get("/yards/{yard_name}/occupancy")
def get_yard_occupancy(yard_name: str, db: Session = Depends(get_db)):
    """
    Get detailed occupancy information for a specific yard
    """
    # Get all locations in this yard
    total_locations = db.query(models.YardLocation).filter(
        models.YardLocation.yard_name == yard_name
    ).count()

    occupied_locations = db.query(models.YardLocation).filter(
        models.YardLocation.yard_name == yard_name,
        models.YardLocation.occupied == True
    ).count()

    # Get blocks in this yard
    blocks = db.query(models.Block).filter(
        models.Block.yard_name == yard_name
    ).all()

    block_info = []
    for block in blocks:
        block_info.append({
            "block_id": block.block_id,
            "block_name": block.block_name,
            "block_type": block.block_type,
            "total_slots": block.total_slots,
            "occupied_slots": block.occupied_slots,
            "occupancy_rate": round((block.occupied_slots / block.total_slots * 100), 2) if block.total_slots > 0 else 0
        })

    return {
        "yard_name": yard_name,
        "total_locations": total_locations,
        "occupied_locations": occupied_locations,
        "available_locations": total_locations - occupied_locations,
        "occupancy_rate": round((occupied_locations / total_locations * 100), 2) if total_locations > 0 else 0,
        "blocks": block_info
    }


@router.get("/blocks/{block_id}/containers")
def get_containers_in_block(block_id: str, db: Session = Depends(get_db)):
    """
    Get all containers currently in a specific block
    """
    containers = db.query(models.Container).filter(
        models.Container.block_id == block_id
    ).all()

    return {
        "block_id": block_id,
        "container_count": len(containers),
        "containers": containers
    }


# ============================================================================
# REPORTING ENDPOINTS
# ============================================================================

@router.get("/reports/daily-summary")
def get_daily_summary(db: Session = Depends(get_db)):
    """
    Get daily operations summary
    """
    from sqlalchemy import func

    # Total containers
    total_containers = db.query(models.Container).count()

    # Containers by type
    by_type = db.query(
        models.Container.type,
        func.count(models.Container.container_id)
    ).group_by(models.Container.type).all()

    # Containers by customs status
    by_customs = db.query(
        models.Container.customs_status,
        func.count(models.Container.container_id)
    ).group_by(models.Container.customs_status).all()

    # Special containers
    hazmat_count = db.query(models.Container).filter(
        models.Container.hazmat_flag == True
    ).count()

    reefer_count = db.query(models.Container).filter(
        models.Container.reefer_flag == True
    ).count()

    # Yard utilization
    total_locations = db.query(models.YardLocation).count()
    occupied_locations = db.query(models.YardLocation).filter(
        models.YardLocation.occupied == True
    ).count()

    return {
        "date": datetime.now().date().isoformat(),
        "total_containers": total_containers,
        "containers_by_movement_type": {t: c for t, c in by_type},
        "containers_by_customs_status": {s: c for s, c in by_customs},
        "special_containers": {
            "hazmat": hazmat_count,
            "reefer": reefer_count
        },
        "yard_utilization": {
            "total_slots": total_locations,
            "occupied": occupied_locations,
            "available": total_locations - occupied_locations,
            "occupancy_rate": round((occupied_locations / total_locations * 100), 2) if total_locations > 0 else 0
        }
    }


# ============================================================================
# VALIDATION ENDPOINT
# ============================================================================

@router.post("/containers/{container_id}/validate-placement")
def validate_container_placement(
    container_id: str,
    location_id: str,
    db: Session = Depends(get_db)
):
    """
    Validate if a container can be placed at a specific location
    Returns validation results and warnings
    """
    container = db.query(models.Container).filter(
        models.Container.container_id == container_id
    ).first()

    if not container:
        raise HTTPException(status_code=404, detail="Container not found")

    location = db.query(models.YardLocation).filter(
        models.YardLocation.location_id == location_id
    ).first()

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    errors = []
    warnings = []

    # Check if location is occupied
    if location.occupied:
        errors.append("Location is already occupied")

    # Check block type compatibility
    block = db.query(models.Block).filter(
        models.Block.block_id == location.block_id
    ).first()

    if block:
        if container.reefer_flag and block.block_type != "Reefer":
            warnings.append("Reefer container should be placed in a Reefer block")

        if container.hazmat_flag and block.block_type != "Hazmat":
            errors.append("Hazmat container must be placed in a Hazmat block")

        if container.load_status == "Empty" and block.block_type != "Empty":
            warnings.append("Empty container should be placed in an Empty block")

    # Check if too high (tier validation)
    if location.tier > 4 and container.weight_class == "Heavy":
        warnings.append("Heavy containers should not be stacked above tier 4")

    is_valid = len(errors) == 0

    return {
        "valid": is_valid,
        "errors": errors,
        "warnings": warnings,
        "can_place": is_valid,
        "location_id": location_id,
        "container_id": container_id
    }


# ============================================================================
# SYNC: PLACE CONTAINERS BASED ON LATEST EVENT
# ============================================================================

@router.post("/sync/place-containers")
def sync_place_containers(db: Session = Depends(get_db)):
    """
    Determines current container placements from event history and updates
    YardLocation + Block tables accordingly.
    Uses v2 tables if USE_V2_TABLES is True.

    Logic:
    1. For each distinct container_number, find the row with MAX(event_sequence_number)
       — that is the container's CURRENT state.
    2. If that row has valid placement (block_id not null, bay > 0, row > 0, tier > 0)
       — the container is currently in the yard. Mark the matching YardLocation as occupied.
    3. Otherwise — the container has left (Vessel Load, Gate Out, etc.) or is not placed yet.

    This endpoint is idempotent: it resets all locations first, then re-applies.
    """
    containers_table = get_containers_table()
    locations_table = get_locations_table()
    blocks_table = get_blocks_table()

    # Step 1: Reset all locations to unoccupied
    db.execute(text(f"""
        UPDATE {locations_table}
        SET occupied = 0, container_id = NULL, status = NULL
    """))

    # Step 2: Reset all block occupied_slots to 0
    db.execute(text(f"UPDATE {blocks_table} SET occupied_slots = 0"))

    # Step 3: Find containers with valid placements
    # For v2 tables, we just use containers that have block_id/bay/row/tier set
    containers = db.execute(text(f"""
        SELECT container_id, container_number, block_id, bay, row, tier,
               COALESCE(event_type, '') as event_type
        FROM {containers_table}
        WHERE block_id IS NOT NULL
          AND bay IS NOT NULL AND bay > 0
          AND row IS NOT NULL AND row > 0
          AND tier IS NOT NULL AND tier > 0
    """)).fetchall()

    placed = []
    skipped = []
    errors = []

    for container in containers:
        container_id, container_number, block_id, bay, row_num, tier, event_type = container

        # Find the matching YardLocation
        location = db.execute(text(f"""
            SELECT location_id, occupied FROM {locations_table}
            WHERE block_id = :block_id AND bay = :bay AND row = :row AND tier = :tier
        """), {"block_id": block_id, "bay": bay, "row": row_num, "tier": tier}).fetchone()

        if not location:
            errors.append({
                "container_number": container_number,
                "container_id": container_id,
                "block_id": block_id,
                "bay": bay,
                "row": row_num,
                "tier": tier,
                "reason": "No matching YardLocation found"
            })
            continue

        location_id, occupied = location

        # Check for conflict (two containers same slot)
        if occupied:
            errors.append({
                "container_number": container_number,
                "container_id": container_id,
                "location_id": location_id,
                "reason": "Location already occupied"
            })
            continue

        # Place the container
        db.execute(text(f"""
            UPDATE {locations_table}
            SET occupied = 1, container_id = :container_id, status = 'actual'
            WHERE location_id = :location_id
        """), {"container_id": container_id, "location_id": location_id})

        # Update container's current_location_id
        db.execute(text(f"""
            UPDATE {containers_table}
            SET current_location_id = :location_id
            WHERE container_id = :container_id
        """), {"location_id": location_id, "container_id": container_id})

        placed.append({
            "container_number": container_number,
            "container_id": container_id,
            "location_id": location_id,
            "block_id": block_id,
            "bay": bay,
            "row": row_num,
            "tier": tier,
            "event_type": event_type,
        })

    # Step 4: Recompute occupied_slots per block from actual location data
    db.execute(text(f"""
        UPDATE {blocks_table}
        SET occupied_slots = (
            SELECT COUNT(*) FROM {locations_table}
            WHERE {locations_table}.block_id = {blocks_table}.block_id AND occupied = 1
        )
    """))

    db.commit()

    return {
        "message": "Container placement sync completed",
        "placed_count": len(placed),
        "skipped_count": len(skipped),
        "error_count": len(errors),
        "placed": placed,
        "skipped": skipped,
        "errors": errors,
    }
