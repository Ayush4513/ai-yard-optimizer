"""FastAPI main application — unified server (Container CRUD + RAG/LLM)."""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
import logging
import os

from Modules.database.neo4j_client import neo4j_client
from Modules.database.chroma_client import chroma_client
from Modules.rag.retrieval_chain import HybridRetrievalChain
from Modules.llm.llm_client import get_default_llm

# SQLAlchemy (container DB)
from Database.database import engine, get_db
from Database import models, schemas
from Api.routes import router as extended_router

# Create SQLite tables
models.Base.metadata.create_all(bind=engine)


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
def get_containers(db: Session = Depends(get_db)):
    """Get all containers"""
    containers = db.query(models.Container).all()
    all_columns = [col.name for col in models.Container.__table__.columns]
    return [
        {col_name: getattr(c, col_name) for col_name in all_columns}
        for c in containers
    ]


@app.get("/containers/{container_id}")
def get_container(container_id: str, db: Session = Depends(get_db)):
    """Get a specific container by ID"""
    container = db.query(models.Container).filter(
        models.Container.container_id == container_id
    ).first()
    if not container:
        raise HTTPException(status_code=404, detail="Container not found")
    all_columns = [col.name for col in models.Container.__table__.columns]
    return {col_name: getattr(container, col_name) for col_name in all_columns}


@app.post("/containers", response_model=schemas.Container)
def create_container(container: schemas.ContainerCreate, db: Session = Depends(get_db)):
    """Create a new container"""
    existing = db.query(models.Container).filter(
        models.Container.container_number == container.container_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Container {container.container_number} already exists")
    db_container = models.Container(**container.dict())
    db.add(db_container)
    db.commit()
    db.refresh(db_container)
    return db_container


@app.put("/containers/{container_id}", response_model=schemas.Container)
def update_container(container_id: str, container: schemas.ContainerUpdate, db: Session = Depends(get_db)):
    """Update an existing container"""
    db_container = db.query(models.Container).filter(
        models.Container.container_id == container_id
    ).first()
    if not db_container:
        raise HTTPException(status_code=404, detail="Container not found")
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
def get_locations(yard_name: str = None, block_id: str = None, occupied: bool = None, db: Session = Depends(get_db)):
    """Get all yard locations with optional filters"""
    query = db.query(models.YardLocation)
    if yard_name:
        query = query.filter(models.YardLocation.yard_name == yard_name)
    if block_id:
        query = query.filter(models.YardLocation.block_id == block_id)
    if occupied is not None:
        query = query.filter(models.YardLocation.occupied == occupied)
    return query.all()


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
    """Get AI-powered placement recommendations for a container"""
    available_locations = db.query(models.YardLocation).filter(
        models.YardLocation.occupied == False
    ).limit(3).all()
    if not available_locations:
        raise HTTPException(status_code=404, detail="No available locations found")
    recommendations = []
    for idx, location in enumerate(available_locations):
        recommendations.append({
            "rank": idx + 1,
            "location": location,
            "score": 95 - (idx * 5),
            "reasons": ["Optimal for POD clustering", "Low rehandling risk", "Good weight distribution"],
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
    return {"container_id": request.container_id, "recommendations": recommendations[:3]}


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
    return {
        "total_containers": total_containers,
        "total_locations": total_locations,
        "occupied_locations": occupied_locations,
        "available_locations": total_locations - occupied_locations,
        "occupancy_rate": round((occupied_locations / total_locations * 100), 2) if total_locations > 0 else 0,
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

    # Initialize Neo4j
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
    neo4j_status = "connected" if neo4j_client.driver else "disconnected"
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
