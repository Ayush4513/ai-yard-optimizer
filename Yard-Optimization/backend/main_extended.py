"""
EXTENDED API ENDPOINTS

Add these endpoints to your main.py file to support the full workflow.
These handle container placement, yard management, and workflow operations.
"""

from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
import models
import schemas
from database import get_db
from datetime import datetime


# ============================================================================
# CONTAINER PLACEMENT WORKFLOW ENDPOINTS
# ============================================================================

@app.post("/containers/{container_id}/assign-location")
def assign_container_to_location(
    container_id: str,
    location_id: str,
    db: Session = Depends(get_db)
):
    """
    Assign a container to a specific yard location
    """
    # Get container
    container = db.query(models.Container).filter(
        models.Container.container_id == container_id
    ).first()

    if not container:
        raise HTTPException(status_code=404, detail="Container not found")

    # Get location
    location = db.query(models.YardLocation).filter(
        models.YardLocation.location_id == location_id
    ).first()

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    # Check if location is occupied
    if location.occupied:
        raise HTTPException(
            status_code=400,
            detail=f"Location {location_id} is already occupied"
        )

    # Update container location
    container.current_location_id = location_id
    container.block_id = location.block_id
    container.bay = location.bay
    container.row = location.row
    container.tier = location.tier

    # Update location status
    location.occupied = True
    location.container_id = container_id
    location.status = "actual"

    # Update block occupancy
    block = db.query(models.Block).filter(
        models.Block.block_id == location.block_id
    ).first()
    if block:
        block.occupied_slots += 1

    db.commit()
    db.refresh(container)

    return {
        "message": "Container assigned successfully",
        "container_id": container_id,
        "location_id": location_id,
        "location_details": {
            "yard": location.yard_name,
            "block": location.block_id,
            "bay": location.bay,
            "row": location.row,
            "tier": location.tier
        }
    }


@app.delete("/containers/{container_id}/remove-from-location")
def remove_container_from_location(
    container_id: str,
    db: Session = Depends(get_db)
):
    """
    Remove a container from its current location (gate out / pickup)
    """
    container = db.query(models.Container).filter(
        models.Container.container_id == container_id
    ).first()

    if not container:
        raise HTTPException(status_code=404, detail="Container not found")

    if not container.current_location_id:
        raise HTTPException(
            status_code=400,
            detail="Container is not currently assigned to any location"
        )

    # Get and free up the location
    location = db.query(models.YardLocation).filter(
        models.YardLocation.location_id == container.current_location_id
    ).first()

    if location:
        location.occupied = False
        location.container_id = None
        location.status = "actual"

        # Update block occupancy
        block = db.query(models.Block).filter(
            models.Block.block_id == location.block_id
        ).first()
        if block and block.occupied_slots > 0:
            block.occupied_slots -= 1

    # Clear container location
    old_location = container.current_location_id
    container.current_location_id = None
    container.block_id = None
    container.bay = None
    container.row = None
    container.tier = None

    db.commit()

    return {
        "message": "Container removed from location",
        "container_id": container_id,
        "previous_location": old_location
    }


# ============================================================================
# BATCH OPERATIONS
# ============================================================================

@app.post("/containers/batch")
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

@app.get("/containers/search")
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
    db: Session = Depends(get_db)
):
    """
    Advanced container search with multiple filters
    """
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

    containers = query.all()
    return containers


# ============================================================================
# YARD OPERATIONS
# ============================================================================

@app.get("/yards/{yard_name}/occupancy")
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


@app.get("/blocks/{block_id}/containers")
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

@app.get("/reports/daily-summary")
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

@app.post("/containers/{container_id}/validate-placement")
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


"""
TO ADD THESE TO YOUR main.py:

1. Copy the endpoint functions you want
2. Paste them into backend/main.py (above the 'if __name__ == "__main__"' line)
3. Restart your backend server
4. Test at http://localhost:8000/docs
"""
