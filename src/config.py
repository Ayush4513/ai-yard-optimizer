"""Configuration management for the application."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Project root directory
PROJECT_ROOT = Path(__file__).parent.parent

# Neo4j Configuration
# When running in Docker, use service name; locally use localhost
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687" if os.getenv("DOCKER_ENV") else "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "container_yard_password")

# ChromaDB Configuration
# When running in Docker, use service name; locally use localhost
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", str(PROJECT_ROOT / "chroma_db"))
CHROMA_HOST = os.getenv("CHROMA_HOST", "chromadb" if os.getenv("DOCKER_ENV") else "localhost")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8000" if os.getenv("DOCKER_ENV") else "8001"))
CHROMA_USE_DOCKER = os.getenv("CHROMA_USE_DOCKER", "true").lower() == "true"

# Anthropic Configuration (Required for LLM features)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")

# LangChain Configuration
LANGCHAIN_TRACING_V2 = os.getenv("LANGCHAIN_TRACING_V2", "false").lower() == "true"
LANGCHAIN_API_KEY = os.getenv("LANGCHAIN_API_KEY", "")

# SQLite Configuration
# When running in Docker, use mounted path; locally use project path
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", 
    "/app/data/sqlite/yard_optimization.db" if os.getenv("DOCKER_ENV") 
    else str(PROJECT_ROOT / "data" / "sqlite" / "yard_optimization.db"))
# Fallback to backend directory if primary path doesn't exist
SQLITE_BACKEND_DB_PATH = os.getenv("SQLITE_BACKEND_DB_PATH",
    "/app/backend/yard_optimization.db" if os.getenv("DOCKER_ENV")
    else str(PROJECT_ROOT / "Yard-Optimization" / "backend" / "yard_optimization.db"))

