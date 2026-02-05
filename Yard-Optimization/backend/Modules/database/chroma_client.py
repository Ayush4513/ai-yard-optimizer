"""ChromaDB client and collection management."""
import chromadb
from chromadb.config import Settings
from pathlib import Path
import logging
from Modules.config import CHROMA_DB_PATH, CHROMA_HOST, CHROMA_PORT, CHROMA_USE_DOCKER

logger = logging.getLogger(__name__)


class ChromaClient:
    """ChromaDB client wrapper with persistent storage or Docker connection."""

    def __init__(self, db_path: str = CHROMA_DB_PATH):
        """Initialize ChromaDB client (Docker or local persistent storage)."""
        self.db_path = Path(db_path)
        self.use_docker = CHROMA_USE_DOCKER

        if self.use_docker:
            # Connect to ChromaDB running in Docker
            try:
                self.client = chromadb.HttpClient(
                    host=CHROMA_HOST,
                    port=CHROMA_PORT,
                    settings=Settings(
                        anonymized_telemetry=False,
                        allow_reset=True
                    )
                )
                logger.info(f"ChromaDB connected to Docker instance at {CHROMA_HOST}:{CHROMA_PORT}")
            except Exception as e:
                logger.error(f"Failed to connect to ChromaDB Docker instance: {e}")
                logger.warning("Falling back to local persistent storage...")
                self.use_docker = False
                self._init_local_client()
        else:
            # Use local persistent storage
            self._init_local_client()

    def _init_local_client(self):
        """Initialize local persistent ChromaDB client."""
        self.db_path.mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(
            path=str(self.db_path),
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        logger.info(f"ChromaDB initialized with local storage at {self.db_path}")

    def get_or_create_collection(self, collection_name: str, metadata: dict = None):
        """Get or create a ChromaDB collection."""
        try:
            collection = self.client.get_or_create_collection(
                name=collection_name,
                metadata=metadata or {}
            )
            logger.info(f"Collection '{collection_name}' ready (count: {collection.count()})")
            return collection
        except Exception as e:
            logger.error(f"Failed to get/create collection '{collection_name}': {e}")
            raise

    def initialize_collections(self):
        """Initialize all required collections."""
        collections = {
            "yard_rules": {
                "description": "Yard stacking rules and constraints"
            },
            "historical_patterns": {
                "description": "Historical container movement patterns"
            },
            "terminal_config": {
                "description": "Terminal configuration and layout"
            },
            "research_insights": {
                "description": "Research model insights and features"
            }
        }

        initialized = {}
        for name, metadata in collections.items():
            initialized[name] = self.get_or_create_collection(name, metadata)

        logger.info(f"Initialized {len(initialized)} ChromaDB collections")
        return initialized


# Global ChromaDB client instance
chroma_client = ChromaClient()
