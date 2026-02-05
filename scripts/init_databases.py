"""Script to initialize databases (Neo4j schema and ChromaDB collections)."""
import sys
from pathlib import Path

# Add backend to path so Modules package is importable
sys.path.insert(0, str(Path(__file__).parent.parent / "Yard-Optimization" / "backend"))

from Modules.database.neo4j_client import neo4j_client
from Modules.database.chroma_client import chroma_client
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    """Initialize both databases."""
    logger.info("Initializing databases...")
    
    # Initialize Neo4j
    logger.info("Connecting to Neo4j...")
    if neo4j_client.connect():
        logger.info("Initializing Neo4j schema...")
        neo4j_client.initialize_schema()
        logger.info("✅ Neo4j initialized successfully")
    else:
        logger.error("❌ Failed to connect to Neo4j. Is Docker container running?")
        logger.info("Run: docker-compose up -d")
        return
    
    # Initialize ChromaDB
    logger.info("Initializing ChromaDB collections...")
    try:
        collections = chroma_client.initialize_collections()
        logger.info(f"✅ ChromaDB initialized successfully with {len(collections)} collections:")
        for name in collections.keys():
            logger.info(f"   - {name}")
    except Exception as e:
        logger.error(f"❌ Failed to initialize ChromaDB: {e}")
        return
    
    logger.info("\n🎉 All databases initialized successfully!")


if __name__ == "__main__":
    main()

