"""Ingest historical container movement data into ChromaDB for pattern learning."""
import csv
import json
import sys
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
import logging

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.database.chroma_client import chroma_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def extract_patterns_from_event(row: Dict) -> Dict[str, Any]:
    """Extract pattern information from a movement event."""
    # Extract key pattern features
    pattern = {
        "containerType": row.get("Container Type", "").strip(),
        "size": row.get("Size (TEU)", "").strip(),
        "weight": row.get("Weight (MT)", "").strip(),
        "weightClass": row.get("Weight Class", "").strip(),
        "pod": row.get("POD", "").strip(),
        "podPriority": row.get("POD Priority", "").strip(),
        "eventType": row.get("Event Type", "").strip(),
        "fromLocation": row.get("From Location ID", "").strip(),
        "toLocation": row.get("To Location ID", "").strip(),
        "tierLevel": row.get("Tier Level", "").strip(),
        "stackHeight": row.get("Stack Height After Move", "").strip(),
        "rehandleFlag": row.get("Rehandle Flag", "0").strip(),
        "moveIntent": row.get("Move Intent", "").strip(),
        "optimalityTag": row.get("Optimality Tag", "").strip(),
        "yardUtilization": row.get("Yard Utilization %", "").strip(),
        "blockUtilization": row.get("Block Utilization %", "").strip(),
        "congestionLevel": row.get("Congestion Level", "").strip(),
        "reasonForMovement": row.get("Reason for Movement", "").strip(),
        "exceptionFlag": row.get("Exception Flag", "0").strip(),
        "exceptionReason": row.get("Exception Reason", "").strip()
    }
    return pattern


def create_pattern_description(pattern: Dict) -> str:
    """Create a descriptive text for the pattern (for embedding)."""
    description_parts = []
    
    # Event context
    if pattern.get("eventType"):
        description_parts.append(f"Event: {pattern['eventType']}")
    
    # Container context
    container_info = []
    if pattern.get("containerType"):
        container_info.append(pattern["containerType"])
    if pattern.get("size"):
        container_info.append(f"{pattern['size']} TEU")
    if pattern.get("weightClass"):
        container_info.append(pattern["weightClass"])
    if container_info:
        description_parts.append(f"Container: {', '.join(container_info)}")
    
    # POD context
    if pattern.get("pod"):
        description_parts.append(f"POD: {pattern['pod']}")
        if pattern.get("podPriority"):
            description_parts.append(f"Priority: {pattern['podPriority']}")
    
    # Stacking context
    if pattern.get("tierLevel") and pattern.get("stackHeight"):
        description_parts.append(f"Stacked at tier {pattern['tierLevel']}, stack height {pattern['stackHeight']}")
    
    # Outcome
    if pattern.get("rehandleFlag") == "1":
        description_parts.append("Resulted in rehandle")
    if pattern.get("optimalityTag"):
        description_parts.append(f"Optimality: {pattern['optimalityTag']}")
    
    # Yard state
    if pattern.get("congestionLevel"):
        description_parts.append(f"Yard congestion: {pattern['congestionLevel']}")
    if pattern.get("yardUtilization"):
        description_parts.append(f"Yard utilization: {pattern['yardUtilization']}%")
    
    # Reason
    if pattern.get("reasonForMovement"):
        description_parts.append(f"Reason: {pattern['reasonForMovement']}")
    
    # Exception
    if pattern.get("exceptionFlag") == "1" and pattern.get("exceptionReason"):
        description_parts.append(f"Exception: {pattern['exceptionReason']}")
    
    return ". ".join(description_parts)


def ingest_historical_data(csv_path: str, collection_name: str = "historical_patterns", max_patterns: int = None):
    """Ingest historical movement data into ChromaDB."""
    logger.info(f"Loading historical data from {csv_path}...")
    
    # Load CSV
    patterns = []
    pattern_count = 0
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pattern = extract_patterns_from_event(row)
            pattern_description = create_pattern_description(pattern)
            
            # Create pattern document
            pattern_doc = {
                "description": pattern_description,
                "pattern": pattern,
                "metadata": {
                    "eventType": pattern.get("eventType", ""),
                    "containerType": pattern.get("containerType", ""),
                    "pod": pattern.get("pod", ""),
                    "rehandleFlag": pattern.get("rehandleFlag", "0"),
                    "optimalityTag": pattern.get("optimalityTag", ""),
                    "congestionLevel": pattern.get("congestionLevel", ""),
                    "moveIntent": pattern.get("moveIntent", ""),
                    "timestamp": row.get("Timestamp", "").strip()
                }
            }
            
            patterns.append(pattern_doc)
            pattern_count += 1
            
            if max_patterns and pattern_count >= max_patterns:
                break
    
    logger.info(f"Extracted {len(patterns)} patterns from CSV")
    
    # Get or create collection
    collection = chroma_client.get_or_create_collection(
        collection_name,
        metadata={"description": "Historical container movement patterns"}
    )
    
    # Prepare documents for ingestion
    documents = []
    metadatas = []
    ids = []
    
    for i, pattern_doc in enumerate(patterns):
        # Use description for embedding
        documents.append(pattern_doc["description"])
        
        # Store full metadata
        metadata = pattern_doc["metadata"].copy()
        metadata["patternData"] = json.dumps(pattern_doc["pattern"])
        
        metadatas.append(metadata)
        ids.append(f"pattern-{i+1}")
    
    # Ingest into ChromaDB
    try:
        # Batch ingest for large datasets
        batch_size = 1000
        total_batches = (len(documents) + batch_size - 1) // batch_size
        
        for batch_num in range(total_batches):
            start_idx = batch_num * batch_size
            end_idx = min(start_idx + batch_size, len(documents))
            
            collection.add(
                documents=documents[start_idx:end_idx],
                metadatas=metadatas[start_idx:end_idx],
                ids=ids[start_idx:end_idx]
            )
            
            logger.info(f"  Ingested batch {batch_num + 1}/{total_batches} ({end_idx - start_idx} patterns)")
        
        logger.info(f"✅ Successfully ingested {len(patterns)} patterns into '{collection_name}'")
        logger.info(f"   Collection now has {collection.count()} total documents")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to ingest patterns: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main ingestion function."""
    project_root = Path(__file__).parent.parent
    
    # Find CSV file
    csv_file = project_root / "container_movement_dataset_v3 (3)(Container Movements).csv"
    
    if not csv_file.exists():
        logger.error(f"❌ CSV file not found: {csv_file}")
        logger.info("💡 Place the CSV file in the project root directory")
        return
    
    # Ingest patterns (limit to 5000 for initial testing, remove limit for full dataset)
    logger.info("📊 Ingesting historical movement patterns...")
    logger.info("   (Processing all events - this may take a few minutes)")
    
    success = ingest_historical_data(
        str(csv_file),
        collection_name="historical_patterns",
        max_patterns=None  # Process all events
    )
    
    if success:
        logger.info("\n🎉 Historical data ingestion complete!")
        logger.info("   Patterns are now available for RAG retrieval")
    else:
        logger.error("\n❌ Historical data ingestion failed")


if __name__ == "__main__":
    main()
