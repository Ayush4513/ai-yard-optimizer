from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from Database import models, schemas
from Database.database import engine, get_db
from Api.routes import router as extended_router
from config import get_containers_table, get_locations_table, get_blocks_table

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Yard Optimization API",
    description="Container yard optimization and management system",
    version="1.0.0"
)

# CORS Configuration - Allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include extended API routes
app.include_router(extended_router)


# ============================================================================
# ROOT & HEALTH CHECK
# ============================================================================

@app.get("/")
def read_root():
    return {
        "message": "Yard Optimization API",
        "status": "running",
        "docs": "/docs",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "NEW_CODE_V2"}


# ============================================================================
# CONTAINER ENDPOINTS
# ============================================================================

@app.get("/containers")
def get_containers(
    skip: int = 0,
    limit: int = 5000,
    db: Session = Depends(get_db)
):
    """
    Get containers with pagination.
    - skip: Number of records to skip (default: 0)
    - limit: Maximum records to return (default: 5000, max: 50000)
    Uses v2 tables if USE_V2_TABLES is True in config.py
    """
    # Cap limit - increased for large dataset viewing
    limit = min(limit, 50000)

    containers_table = get_containers_table()

    # Get total count for pagination metadata
    total = db.execute(text(f"SELECT COUNT(*) FROM {containers_table}")).scalar()

    # Get containers with pagination
    containers = db.execute(text(f"""
        SELECT * FROM {containers_table}
        LIMIT :limit OFFSET :skip
    """), {"limit": limit, "skip": skip}).fetchall()

    # Get column names dynamically
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
    """Get a specific container by ID. Uses v2 tables if USE_V2_TABLES is True."""
    containers_table = get_containers_table()

    # Get column names dynamically
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
    """
    Create a new container. Uses v2 tables if USE_V2_TABLES is True.

    If block_id, bay, row, tier are provided, the container is automatically
    placed in that location (goes to "retrieval" instead of "incoming").
    """
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

    # Get the container data as dict
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
        # Find the matching location
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

    # Return the created container
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
    """Update an existing container. Uses v2 tables if USE_V2_TABLES is True."""
    containers_table = get_containers_table()

    # Check if container exists
    existing = db.execute(text(f"""
        SELECT container_id FROM {containers_table} WHERE container_id = :container_id
    """), {"container_id": container_id}).fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="Container not found")

    # Update only provided fields
    update_data = container.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Build UPDATE statement
    set_clauses = [f"{col} = :{col}" for col in update_data.keys()]
    update_data["container_id"] = container_id

    db.execute(text(f"""
        UPDATE {containers_table}
        SET {', '.join(set_clauses)}
        WHERE container_id = :container_id
    """), update_data)
    db.commit()

    return {"message": f"Container {container_id} updated successfully"}


@app.delete("/containers/{container_id}")
def delete_container(container_id: str, db: Session = Depends(get_db)):
    """Delete a container. Uses v2 tables if USE_V2_TABLES is True."""
    containers_table = get_containers_table()

    # Check if container exists
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
    """
    Get yard locations with optional filters and pagination.
    - skip: Number of records to skip (default: 0)
    - limit: Maximum records to return (default: 5000, max: 50000)
    Uses v2 tables if USE_V2_TABLES is True in config.py
    """
    # Cap limit - increased for large dataset viewing
    limit = min(limit, 50000)

    locations_table = get_locations_table()

    # Build WHERE clause dynamically
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

    # Get total count for pagination metadata
    total = db.execute(text(f"SELECT COUNT(*) FROM {locations_table} WHERE {where_clause}"), params).scalar()

    # Get locations with pagination
    locations = db.execute(text(f"""
        SELECT location_id, yard_name, block_id, bay, row, tier, occupied, container_id, status
        FROM {locations_table}
        WHERE {where_clause}
        LIMIT :limit OFFSET :skip
    """), params).fetchall()

    # Convert to dict format
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
def update_location(
    location_id: str,
    location: schemas.YardLocationUpdate,
    db: Session = Depends(get_db)
):
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
def get_placement_recommendation(
    request: schemas.PlacementRequest,
    db: Session = Depends(get_db)
):
    """
    Get AI-powered placement recommendations for a container
    This is where you'll implement your optimization algorithm
    """
    # TODO: Implement your optimization logic here
    # For now, returning a mock response

    # Find available locations
    available_locations = db.query(models.YardLocation).filter(
        models.YardLocation.occupied == False
    ).limit(3).all()

    if not available_locations:
        raise HTTPException(status_code=404, detail="No available locations found")

    # Mock recommendations (replace with your algorithm)
    recommendations = []
    for idx, location in enumerate(available_locations):
        recommendations.append({
            "rank": idx + 1,
            "location": location,
            "score": 95 - (idx * 5),
            "reasons": [
                "Optimal for POD clustering",
                "Low rehandling risk",
                "Good weight distribution"
            ],
            "warnings": [],
            "estimated_retrieval_minutes": 5 + (idx * 2),
            "metrics": {
                "rehandle_risk_percent": 10 + (idx * 5),
                "blocking_containers": idx,
                "distance_to_quay_m": 150,
                "distance_to_gate_m": 200,
                "pod_cluster_match_percent": 85,
                "weight_stack_compliant": True,
                "block_utilization_percent": 75
            }
        })

    return {
        "container_id": request.container_id,
        "recommendations": recommendations[:3]
    }


# ============================================================================
# STATISTICS & ANALYTICS ENDPOINTS
# ============================================================================

@app.get("/stats/overview")
def get_yard_stats(db: Session = Depends(get_db)):
    """Get overall yard statistics"""
    total_containers = db.query(models.Container).count()
    total_locations = db.query(models.YardLocation).count()
    occupied_locations = db.query(models.YardLocation).filter(
        models.YardLocation.occupied == True
    ).count()

    containers_by_type = db.query(
        models.Container.container_type,
        db.query(models.Container).filter(
            models.Container.container_type == models.Container.container_type
        ).count()
    ).all()

    return {
        "total_containers": total_containers,
        "total_locations": total_locations,
        "occupied_locations": occupied_locations,
        "available_locations": total_locations - occupied_locations,
        "occupancy_rate": round((occupied_locations / total_locations * 100), 2) if total_locations > 0 else 0,
        "containers_by_type": {ct: count for ct, count in containers_by_type}
    }


@app.get("/stats/containers")
def get_container_stats(db: Session = Depends(get_db)):
    """Get container statistics"""
    from sqlalchemy import func

    total = db.query(models.Container).count()

    by_type = db.query(
        models.Container.container_type,
        func.count(models.Container.container_id)
    ).group_by(models.Container.container_type).all()

    by_status = db.query(
        models.Container.customs_status,
        func.count(models.Container.container_id)
    ).group_by(models.Container.customs_status).all()

    return {
        "total": total,
        "by_type": {t: c for t, c in by_type},
        "by_status": {s: c for s, c in by_status}
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
