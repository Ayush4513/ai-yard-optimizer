"""FastAPI main application."""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import logging
import os
from src.database.neo4j_client import neo4j_client
from src.database.chroma_client import chroma_client
from src.rag.retrieval_chain import HybridRetrievalChain
from src.llm.llm_client import get_default_llm


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
