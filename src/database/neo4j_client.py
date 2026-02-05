"""Neo4j database client and connection management."""
from neo4j import GraphDatabase
from typing import Optional
import logging
from src.config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

logger = logging.getLogger(__name__)


class Neo4jClient:
    """Neo4j database client wrapper."""
    
    def __init__(self, uri: str = NEO4J_URI, user: str = NEO4J_USER, password: str = NEO4J_PASSWORD):
        """Initialize Neo4j client."""
        self.uri = uri
        self.user = user
        self.password = password
        self.driver: Optional[GraphDatabase.driver] = None
        
    def connect(self):
        """Establish connection to Neo4j."""
        try:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            # Test connection
            with self.driver.session() as session:
                session.run("RETURN 1")
            logger.info(f"Connected to Neo4j at {self.uri}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            return False
    
    def close(self):
        """Close Neo4j connection."""
        if self.driver:
            self.driver.close()
            logger.info("Neo4j connection closed")
    
    def get_session(self):
        """Get a Neo4j session."""
        if not self.driver:
            self.connect()
        return self.driver.session()
    
    def execute_query(self, query: str, parameters: dict = None):
        """Execute a Cypher query."""
        with self.get_session() as session:
            result = session.run(query, parameters or {})
            return [record.data() for record in result]
    
    def initialize_schema(self):
        """Initialize Neo4j schema with constraints and indexes."""
        schema_queries = [
            # Constraints
            "CREATE CONSTRAINT container_number_unique IF NOT EXISTS FOR (c:Container) REQUIRE c.containerNumber IS UNIQUE",
            "CREATE CONSTRAINT slot_id_unique IF NOT EXISTS FOR (s:Slot) REQUIRE s.slotId IS UNIQUE",
            "CREATE CONSTRAINT vessel_imo_unique IF NOT EXISTS FOR (v:Vessel) REQUIRE v.imoNumber IS UNIQUE",
            "CREATE CONSTRAINT truck_appointment_id_unique IF NOT EXISTS FOR (t:TruckAppointment) REQUIRE t.appointmentId IS UNIQUE",
            
            # Indexes
            "CREATE INDEX container_status_idx IF NOT EXISTS FOR (c:Container) ON (c.status)",
            "CREATE INDEX container_type_idx IF NOT EXISTS FOR (c:Container) ON (c.containerType)",
            "CREATE INDEX slot_zone_idx IF NOT EXISTS FOR (s:Slot) ON (s.zoneType)",
            "CREATE INDEX vessel_voyage_idx IF NOT EXISTS FOR (v:Vessel) ON (v.voyageNumber)",
        ]
        
        with self.get_session() as session:
            for query in schema_queries:
                try:
                    session.run(query)
                    logger.info(f"Executed schema query: {query[:50]}...")
                except Exception as e:
                    logger.warning(f"Schema query failed (may already exist): {e}")
        
        logger.info("Neo4j schema initialized")


# Global Neo4j client instance
neo4j_client = Neo4jClient()

