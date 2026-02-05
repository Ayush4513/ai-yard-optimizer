"""Test script to verify database connections."""
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.database.neo4j_client import neo4j_client
from src.database.chroma_client import chroma_client
from src.rag.retrieval_chain import HybridRetrievalChain
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_neo4j():
    """Test Neo4j connection."""
    logger.info("Testing Neo4j connection...")
    try:
        if neo4j_client.connect():
            result = neo4j_client.execute_query("RETURN 'Neo4j is connected!' as message")
            logger.info(f"✅ Neo4j: {result[0]['message']}")
            return True
        else:
            logger.error("❌ Neo4j: Connection failed")
            return False
    except Exception as e:
        logger.error(f"❌ Neo4j: {e}")
        return False


def test_chromadb():
    """Test ChromaDB connection."""
    logger.info("Testing ChromaDB connection...")
    try:
        collections = chroma_client.initialize_collections()
        logger.info(f"✅ ChromaDB: {len(collections)} collections ready")
        for name, collection in collections.items():
            logger.info(f"   - {name}: {collection.count()} documents")
        return True
    except Exception as e:
        logger.error(f"❌ ChromaDB: {e}")
        return False


def test_retrieval_chain():
    """Test retrieval chain."""
    logger.info("Testing retrieval chain...")
    try:
        chain = HybridRetrievalChain(collection_name="yard_rules")
        results = chain.retrieve_from_chromadb("test query", top_k=1)
        logger.info(f"✅ Retrieval Chain: Working (retrieved {len(results)} results)")
        return True
    except Exception as e:
        logger.error(f"❌ Retrieval Chain: {e}")
        return False


def main():
    """Run all tests."""
    logger.info("=" * 50)
    logger.info("Database Connection Tests")
    logger.info("=" * 50)
    
    results = {
        "Neo4j": test_neo4j(),
        "ChromaDB": test_chromadb(),
        "Retrieval Chain": test_retrieval_chain()
    }
    
    logger.info("\n" + "=" * 50)
    logger.info("Test Results Summary")
    logger.info("=" * 50)
    for component, status in results.items():
        status_icon = "✅" if status else "❌"
        logger.info(f"{status_icon} {component}")
    
    if all(results.values()):
        logger.info("\n🎉 All tests passed!")
    else:
        logger.warning("\n⚠️  Some tests failed. Check the logs above.")


if __name__ == "__main__":
    main()

