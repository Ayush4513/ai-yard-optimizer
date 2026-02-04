from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import models
import schemas
from database import engine, get_db

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
def get_containers(db: Session = Depends(get_db)):
    """Get all containers"""
    containers = db.query(models.Container).all()

    # Convert each ORM object to dict with all columns
    all_columns = [col.name for col in models.Container.__table__.columns]
    containers_list = [
        {col_name: getattr(container, col_name) for col_name in all_columns}
        for container in containers
    ]

    return containers_list


@app.get("/containers/{container_id}")
def get_container(container_id: str, db: Session = Depends(get_db)):
    """Get a specific container by ID"""
    container = db.query(models.Container).filter(
        models.Container.container_id == container_id
    ).first()

    if not container:
        raise HTTPException(status_code=404, detail="Container not found")

    # Convert ORM object to dict with all columns
    all_columns = [col.name for col in models.Container.__table__.columns]
    container_dict = {col_name: getattr(container, col_name) for col_name in all_columns}

    return container_dict


@app.post("/containers", response_model=schemas.Container)
def create_container(container: schemas.ContainerCreate, db: Session = Depends(get_db)):
    """Create a new container"""
    # Check if container already exists
    existing = db.query(models.Container).filter(
        models.Container.container_number == container.container_number
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Container {container.container_number} already exists"
        )

    db_container = models.Container(**container.dict())
    db.add(db_container)
    db.commit()
    db.refresh(db_container)
    return db_container


@app.put("/containers/{container_id}", response_model=schemas.Container)
def update_container(
    container_id: str,
    container: schemas.ContainerUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing container"""
    db_container = db.query(models.Container).filter(
        models.Container.container_id == container_id
    ).first()

    if not db_container:
        raise HTTPException(status_code=404, detail="Container not found")

    # Update only provided fields
    update_data = container.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_container, field, value)

    db.commit()
    db.refresh(db_container)
    return db_container


@app.delete("/containers/{container_id}")
def delete_container(container_id: str, db: Session = Depends(get_db)):
    """Delete a container"""
    db_container = db.query(models.Container).filter(
        models.Container.container_id == container_id
    ).first()

    if not db_container:
        raise HTTPException(status_code=404, detail="Container not found")

    db.delete(db_container)
    db.commit()
    return {"message": f"Container {container_id} deleted successfully"}


# ============================================================================
# YARD LOCATION ENDPOINTS
# ============================================================================

@app.get("/locations", response_model=List[schemas.YardLocation])
def get_locations(
    yard_name: str = None,
    block_id: str = None,
    occupied: bool = None,
    db: Session = Depends(get_db)
):
    """Get all yard locations with optional filters"""
    query = db.query(models.YardLocation)

    if yard_name:
        query = query.filter(models.YardLocation.yard_name == yard_name)
    if block_id:
        query = query.filter(models.YardLocation.block_id == block_id)
    if occupied is not None:
        query = query.filter(models.YardLocation.occupied == occupied)

    locations = query.all()
    return locations


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
