"""Script to check what's currently in Neo4j and ChromaDB."""
import sys
from pathlib import Path

# Add backend to path so Modules package is importable
sys.path.insert(0, str(Path(__file__).parent.parent / "Yard-Optimization" / "backend"))

from Modules.database.neo4j_client import neo4j_client
from Modules.database.chroma_client import chroma_client
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def check_neo4j():
    """Check what's in Neo4j."""
    logger.info("\n" + "=" * 60)
    logger.info("NEO4J (Graph Database) - Current Contents")
    logger.info("=" * 60)
    
    try:
        if not neo4j_client.connect():
            logger.error("❌ Cannot connect to Neo4j")
            return
        
        # Check nodes
        logger.info("\n📊 Node Counts:")
        node_types = ["Container", "Slot", "Vessel", "TruckAppointment", "Equipment", "Yard"]
        for node_type in node_types:
            query = f"MATCH (n:{node_type}) RETURN count(n) as count"
            result = neo4j_client.execute_query(query)
            count = result[0]['count'] if result else 0
            status = "✅" if count > 0 else "⚪"
            logger.info(f"   {status} {node_type}: {count}")
        
        # Check relationships
        logger.info("\n🔗 Relationship Counts:")
        rel_types = ["STACKED_ON", "LOCATED_AT", "ASSIGNED_TO", "SCHEDULED_FOR"]
        for rel_type in rel_types:
            query = f"MATCH ()-[r:{rel_type}]-() RETURN count(r) as count"
            result = neo4j_client.execute_query(query)
            count = result[0]['count'] if result else 0
            status = "✅" if count > 0 else "⚪"
            logger.info(f"   {status} {rel_type}: {count}")
        
        # Check constraints
        logger.info("\n🔒 Constraints:")
        query = "SHOW CONSTRAINTS"
        result = neo4j_client.execute_query(query)
        if result:
            for constraint in result:
                logger.info(f"   ✅ {constraint.get('name', 'Unknown')}")
        else:
            logger.info("   ⚪ No constraints found")
        
        # Check indexes
        logger.info("\n📇 Indexes:")
        query = "SHOW INDEXES"
        result = neo4j_client.execute_query(query)
        if result:
            for index in result:
                logger.info(f"   ✅ {index.get('name', 'Unknown')}")
        else:
            logger.info("   ⚪ No indexes found")
            
    except Exception as e:
        logger.error(f"❌ Error checking Neo4j: {e}")


def check_chromadb():
    """Check what's in ChromaDB."""
    logger.info("\n" + "=" * 60)
    logger.info("CHROMADB (RAG Knowledge Base) - Current Contents")
    logger.info("=" * 60)
    
    try:
        # Initialize collections
        collections = chroma_client.initialize_collections()
        
        logger.info("\n📚 Collections:")
        for name, collection in collections.items():
            count = collection.count()
            status = "✅" if count > 0 else "⚪"
            logger.info(f"   {status} {name}: {count} documents")
            
            # Show sample metadata if available
            if count > 0:
                try:
                    sample = collection.peek(limit=1)
                    if sample and 'metadatas' in sample and sample['metadatas']:
                        metadata = sample['metadatas'][0]
                        logger.info(f"      Sample metadata keys: {list(metadata.keys())[:3]}")
                except:
                    pass
        
        # Expected collections based on architecture
        expected = {
            "yard_rules": "Rules",
            "historical_patterns": "Patterns",
            "research_insights": "Research",
            "terminal_config": "Config"
        }
        
        logger.info("\n📋 Expected Collections (from architecture):")
        for collection_name, description in expected.items():
            if collection_name in collections:
                count = collections[collection_name].count()
                status = "✅" if count > 0 else "⚪"
                logger.info(f"   {status} {collection_name} ({description}): {count} documents")
            else:
                logger.info(f"   ❌ {collection_name} ({description}): NOT FOUND")
                
    except Exception as e:
        logger.error(f"❌ Error checking ChromaDB: {e}")


def main():
    """Check both databases."""
    logger.info("\n🔍 Checking Database Contents...")
    logger.info("Based on architecture diagram:\n")
    
    check_neo4j()
    check_chromadb()
    
    logger.info("\n" + "=" * 60)
    logger.info("Summary")
    logger.info("=" * 60)
    logger.info("\n✅ = Has data")
    logger.info("⚪ = Empty (schema initialized)")
    logger.info("❌ = Not found/Error")
    logger.info("\n💡 To populate data:")
    logger.info("   - Rules: python scripts/ingest_rules.py")
    logger.info("   - Historical data: python scripts/ingest_historical_data.py")
    logger.info("   - Neo4j: Data will be added when containers/slots are created via API")


if __name__ == "__main__":
    main()

