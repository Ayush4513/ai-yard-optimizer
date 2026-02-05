"""SQLite database client and connection management (read-only)."""
import sqlite3
from pathlib import Path
from typing import Optional, List, Dict, Any
import logging
from src.config import SQLITE_DB_PATH, SQLITE_BACKEND_DB_PATH

logger = logging.getLogger(__name__)


class SQLiteClient:
    """SQLite database client wrapper (read-only access)."""
    
    def __init__(self, db_path: str = None):
        """
        Initialize SQLite client.
        
        Args:
            db_path: Path to SQLite database file. If None, uses config default.
        """
        self.db_path = db_path or self._find_database()
        self.connection: Optional[sqlite3.Connection] = None
        
    def _find_database(self) -> str:
        """
        Find the SQLite database file, checking multiple possible locations.
        
        Returns:
            Path to the database file
        """
        # Try primary path first
        primary_path = Path(SQLITE_DB_PATH)
        if primary_path.exists():
            logger.info(f"Found SQLite database at primary path: {primary_path}")
            return str(primary_path)
        
        # Try backend path as fallback
        backend_path = Path(SQLITE_BACKEND_DB_PATH)
        if backend_path.exists():
            logger.info(f"Found SQLite database at backend path: {backend_path}")
            return str(backend_path)
        
        # If neither exists, return primary path (will create connection error)
        logger.warning(f"SQLite database not found at {primary_path} or {backend_path}")
        logger.warning("Using primary path - connection will fail if file doesn't exist")
        return str(primary_path)
    
    def connect(self) -> bool:
        """
        Establish connection to SQLite database (read-only).
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            # Connect in read-only mode
            db_uri = f"file:{self.db_path}?mode=ro"
            self.connection = sqlite3.connect(db_uri, uri=True)
            self.connection.row_factory = sqlite3.Row  # Return rows as dict-like objects
            
            # Test connection
            cursor = self.connection.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            
            logger.info(f"Connected to SQLite database at {self.db_path}")
            return True
        except sqlite3.Error as e:
            logger.error(f"Failed to connect to SQLite database: {e}")
            self.connection = None
            return False
        except Exception as e:
            logger.error(f"Unexpected error connecting to SQLite: {e}")
            self.connection = None
            return False
    
    def close(self):
        """Close SQLite connection."""
        if self.connection:
            self.connection.close()
            self.connection = None
            logger.info("SQLite connection closed")
    
    def get_connection(self) -> sqlite3.Connection:
        """
        Get SQLite connection, creating one if needed.
        
        Returns:
            SQLite connection object
        """
        if not self.connection:
            self.connect()
        if not self.connection:
            raise RuntimeError("Failed to establish SQLite connection")
        return self.connection
    
    def execute_query(self, query: str, parameters: tuple = None) -> List[Dict[str, Any]]:
        """
        Execute a read-only SQL query.
        
        Args:
            query: SQL query string
            parameters: Optional tuple of parameters for parameterized queries
            
        Returns:
            List of dictionaries representing query results
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            if parameters:
                cursor.execute(query, parameters)
            else:
                cursor.execute(query)
            
            # Fetch all results and convert to list of dicts
            rows = cursor.fetchall()
            results = [dict(row) for row in rows]
            
            cursor.close()
            return results
        except sqlite3.Error as e:
            logger.error(f"SQLite query error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error executing query: {e}")
            raise
    
    def get_table_names(self) -> List[str]:
        """
        Get list of all table names in the database.
        
        Returns:
            List of table names
        """
        query = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        results = self.execute_query(query)
        return [row['name'] for row in results]
    
    def get_table_schema(self, table_name: str) -> List[Dict[str, Any]]:
        """
        Get schema information for a specific table.
        
        Args:
            table_name: Name of the table
            
        Returns:
            List of dictionaries with column information
        """
        query = f"PRAGMA table_info({table_name})"
        return self.execute_query(query)
    
    def get_table_count(self, table_name: str) -> int:
        """
        Get the number of rows in a table.
        
        Args:
            table_name: Name of the table
            
        Returns:
            Number of rows
        """
        query = f"SELECT COUNT(*) as count FROM {table_name}"
        results = self.execute_query(query)
        return results[0]['count'] if results else 0
    
    def query_table(self, table_name: str, limit: int = None, offset: int = 0, 
                   where_clause: str = None, where_params: tuple = None) -> List[Dict[str, Any]]:
        """
        Query a table with optional filtering and pagination.
        
        Args:
            table_name: Name of the table
            limit: Maximum number of rows to return
            offset: Number of rows to skip
            where_clause: Optional WHERE clause (without "WHERE" keyword)
            where_params: Parameters for WHERE clause
            
        Returns:
            List of dictionaries representing rows
        """
        query = f"SELECT * FROM {table_name}"
        
        if where_clause:
            query += f" WHERE {where_clause}"
        
        if limit:
            query += f" LIMIT {limit}"
            if offset:
                query += f" OFFSET {offset}"
        
        return self.execute_query(query, where_params)
    
    def is_connected(self) -> bool:
        """
        Check if database connection is active.
        
        Returns:
            True if connected, False otherwise
        """
        if not self.connection:
            return False
        try:
            cursor = self.connection.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            return True
        except:
            return False


# Global SQLite client instance
sqlite_client = SQLiteClient()

