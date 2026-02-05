"""Ingest stacking rules from JSON into ChromaDB."""
import json
import sys
from pathlib import Path
import logging

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.database.chroma_client import chroma_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def ingest_rules(json_path: str, collection_name: str = "yard_rules"):
    """Ingest rules from JSON file into ChromaDB."""
    # Load rules
    with open(json_path, 'r', encoding='utf-8') as f:
        rules = json.load(f)
    
    logger.info(f"Loading {len(rules)} rules from {json_path}...")
    
    # Get or create collection
    collection = chroma_client.get_or_create_collection(
        collection_name,
        metadata={"description": "Yard stacking rules and constraints"}
    )
    
    # Prepare documents for ingestion
    documents = []
    metadatas = []
    ids = []
    
    for rule in rules:
        # Use ruleDescription for embedding (semantic search)
        documents.append(rule["ruleDescription"])
        
        # Store metadata for filtering
        metadata = {
            "ruleId": rule["ruleId"],
            "ruleName": rule["ruleName"],
            "category": rule["ruleCategory"],
            "type": rule["ruleType"],
            "priority": rule["priority"],
            "zones": ",".join(rule.get("applicableZones", [])),
        }
        
        # Add additional metadata if available
        if "metadata" in rule:
            for key, value in rule["metadata"].items():
                if value:  # Only add non-empty values
                    metadata[key] = str(value)
        
        metadatas.append(metadata)
        ids.append(rule["ruleId"])
    
    # Ingest into ChromaDB
    try:
        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        logger.info(f"✅ Successfully ingested {len(rules)} rules into '{collection_name}'")
        logger.info(f"   Collection now has {collection.count()} total documents")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to ingest rules: {e}")
        return False


def main():
    """Main ingestion function."""
    project_root = Path(__file__).parent.parent
    data_dir = project_root / "data"
    
    # Check for combined rules file
    combined_rules = data_dir / "all_rules.json"
    
    if not combined_rules.exists():
        logger.error(f"❌ Rules file not found: {combined_rules}")
        logger.info("💡 Run 'python scripts/convert_rules_csv_to_json.py' first")
        return
    
    # Ingest rules
    success = ingest_rules(str(combined_rules), collection_name="yard_rules")
    
    if success:
        logger.info("\n🎉 Rules ingestion complete!")
        logger.info("   You can now query rules using the RAG retrieval chain")
    else:
        logger.error("\n❌ Rules ingestion failed")


if __name__ == "__main__":
    main()

