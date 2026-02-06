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

from Modules.database.neo4j_client import neo4j_client
from Modules.database.chroma_client import chroma_client
from Modules.rag.retrieval_chain import HybridRetrievalChain
from Modules.llm.llm_client import get_default_llm

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

    # 1. Get available slots (unoccupied locations) with block info
    available = db.execute(text(f"""
        SELECT yl.*, b.block_type, b.reefer_plugs, b.hazmat_certified
        FROM {locations_table} yl
        JOIN {blocks_table} b ON yl.block_id = b.block_id
        WHERE yl.occupied = 0
        ORDER BY yl.block_id, yl.bay, yl.row, yl.tier
        LIMIT 50
    """)).mappings().all()

    if not available:
        raise HTTPException(status_code=404, detail="No available locations found")

    # 2. Get yard state (occupancy per block)
    block_stats = db.execute(text(f"""
        SELECT b.block_id, b.block_type, b.total_slots, b.reefer_plugs, b.hazmat_certified,
               COUNT(c.container_id) as container_count
        FROM {blocks_table} b
        LEFT JOIN {containers_table} c ON c.block_id = b.block_id
        GROUP BY b.block_id
    """)).mappings().all()

    # 3. Get ChromaDB context (yard rules)
    rules_context = ""
    try:
        rules_col = chroma_client.client.get_collection("yard_rules")
        if rules_col.count() > 0:
            results = rules_col.query(
                query_texts=[f"placement rules for {request.container_type or 'general'} container"],
                n_results=5
            )
            if results and results.get("documents"):
                rules_context = "\n".join(results["documents"][0])
    except Exception:
        logger.debug("ChromaDB yard_rules query failed, continuing without context")

    # 4. Build LLM prompt
    available_summary = {}
    for slot in available[:50]:
        bid = slot["block_id"]
        if bid not in available_summary:
            available_summary[bid] = {"count": 0, "type": slot.get("block_type", "General")}
        available_summary[bid]["count"] += 1

    block_state_text = "\n".join([
        f"- {bs['block_id']}: {bs['block_type']}, {bs['container_count']}/{bs['total_slots']} slots used"
        for bs in block_stats
    ])

    available_text = "\n".join([
        f"- {bid}: {info['count']} available slots ({info['type']})"
        for bid, info in available_summary.items()
    ])

    slot_ids_text = "\n".join([f"- {s['location_id']}" for s in available[:20]])

    prompt = f"""You are a container yard optimization expert. Recommend the TOP 3 placement locations for this container.

Container Details:
- Container ID: {request.container_id}
- Type: {request.container_type or 'General'}
- POD: {request.pod or 'Unknown'}
- Weight Class: {request.weight_class or 'Medium'}
- Hazmat: {request.hazmat_flag}
- Reefer: {request.reefer_flag}

Yard Rules:
{rules_context or 'Standard stacking rules apply.'}

Block Occupancy:
{block_state_text}

Available Slots by Block:
{available_text}

Available Slot IDs (first 20):
{slot_ids_text}

Provide exactly 3 recommendations in JSON array format:
[
  {{"location_id": "BLOCK-BAY-ROW-TIER", "block_id": "BLOCK_ID", "bay": BAY_NUMBER, "row": ROW_NUMBER, "tier": TIER_NUMBER, "score": 0-100, "reasons": ["reason1", "reason2"], "warnings": [], "rehandle_risk": 0-100, "estimated_retrieval_minutes": MINUTES}},
  ...
]

Pick locations from the available slot IDs listed above. Optimize for:
1. Minimize rehandle risk
2. POD clustering
3. Weight stacking compliance
4. Block utilization balance"""

    # 5. Call LLM and parse response
    recommendations = []
    try:
        llm = get_default_llm()
        if llm:
            response = llm.generate(prompt)
            logger.info(f"LLM response received ({len(response)} chars)")
            # Parse JSON array from LLM response
            parsed = None
            # Strategy 1: Try extracting from ```json ... ``` code block
            code_match = re_lib.search(r'```(?:json)?\s*([\s\S]*?)```', response)
            if code_match:
                code_content = code_match.group(1).strip()
                try:
                    parsed = json_lib.loads(code_content)
                except json_lib.JSONDecodeError as e:
                    logger.debug(f"Code block JSON parse failed: {e}")
            # Strategy 2: Find balanced JSON array brackets
            if parsed is None:
                start_idx = response.find('[')
                if start_idx != -1:
                    depth = 0
                    end_idx = start_idx
                    for i in range(start_idx, len(response)):
                        if response[i] == '[':
                            depth += 1
                        elif response[i] == ']':
                            depth -= 1
                            if depth == 0:
                                end_idx = i + 1
                                break
                    json_str = response[start_idx:end_idx]
                    parsed = json_lib.loads(json_str)
            if parsed:
                for idx, rec in enumerate(parsed[:3]):
                    loc_id = rec.get("location_id", "")
                    # Find matching available slot
                    matching = [s for s in available if s["location_id"] == loc_id]
                    if matching:
                        slot = matching[0]
                    else:
                        slot = available[idx] if idx < len(available) else available[0]
                        loc_id = slot["location_id"]

                    recommendations.append({
                        "rank": idx + 1,
                        "location": {
                            "location_id": loc_id,
                            "yard_name": slot.get("yard_name", ""),
                            "block_id": slot.get("block_id", ""),
                            "bay": int(slot["bay"]),
                            "row": int(slot["row"]),
                            "tier": int(slot["tier"]),
                            "occupied": False,
                        },
                        "score": rec.get("score", 90 - idx * 5),
                        "reasons": rec.get("reasons", ["LLM recommended"]),
                        "warnings": rec.get("warnings", []),
                        "estimated_retrieval_minutes": rec.get("estimated_retrieval_minutes", 5 + idx * 2),
                        "metrics": {
                            "rehandle_risk_percent": rec.get("rehandle_risk", 10 + idx * 5),
                            "blocking_containers": idx,
                            "distance_to_quay_m": 150,
                            "distance_to_gate_m": 200,
                            "pod_cluster_match_percent": 85 - idx * 5,
                            "weight_stack_compliant": True,
                            "block_utilization_percent": 75,
                        }
                    })
    except Exception as e:
        logger.warning(f"LLM recommendation failed: {e}")

    # 6. Fallback if LLM produced fewer than 3 recommendations
    while len(recommendations) < 3:
        idx = len(recommendations)
        slot = available[idx] if idx < len(available) else available[0]
        recommendations.append({
            "rank": idx + 1,
            "location": {
                "location_id": slot["location_id"],
                "yard_name": slot.get("yard_name", ""),
                "block_id": slot.get("block_id", ""),
                "bay": int(slot["bay"]),
                "row": int(slot["row"]),
                "tier": int(slot["tier"]),
                "occupied": False,
            },
            "score": 80 - idx * 5,
            "reasons": ["Available slot with good accessibility", "Balanced block utilization"],
            "warnings": ["Fallback recommendation (LLM unavailable)"],
            "estimated_retrieval_minutes": 5 + idx * 2,
            "metrics": {
                "rehandle_risk_percent": 15 + idx * 5,
                "blocking_containers": idx,
                "distance_to_quay_m": 150,
                "distance_to_gate_m": 200,
                "pod_cluster_match_percent": 75,
                "weight_stack_compliant": True,
                "block_utilization_percent": 70,
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
