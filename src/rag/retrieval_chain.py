"""LangChain-based retrieval chain for querying ChromaDB, Neo4j, and SQLite."""
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.prompts import PromptTemplate
from langchain.agents import initialize_agent, AgentType
from typing import List, Dict, Any, Optional
import logging
import re
from src.database.chroma_client import chroma_client
from src.database.neo4j_client import neo4j_client
from src.database.sqlite_client import sqlite_client
from src.config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL

logger = logging.getLogger(__name__)

# Lazy import for Anthropic
try:
    from langchain_anthropic import ChatAnthropic
    _anthropic_available = True
except ImportError:
    _anthropic_available = False
    ChatAnthropic = None


class HybridRetrievalChain:
    """Hybrid retrieval chain that queries both ChromaDB and Neo4j."""
    
    def __init__(self, collection_name: str = "yard_rules", use_llm: bool = True):
        """
        Initialize retrieval chain.
        
        Args:
            collection_name: ChromaDB collection name
            use_llm: Whether to initialize LLM for RAG (requires ANTHROPIC_API_KEY)
        """
        self.collection_name = collection_name
        self.use_llm = use_llm
        
        # Initialize embeddings (using sentence-transformers for local embeddings)
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        
        # Initialize ChromaDB vector store
        self.vector_store = Chroma(
            client=chroma_client.client,
            collection_name=collection_name,
            embedding_function=self.embeddings
        )
        
        # Initialize Anthropic Claude LLM for RAG if available
        self.llm = None
        if use_llm and _anthropic_available and ANTHROPIC_API_KEY:
            try:
                self.llm = ChatAnthropic(
                    model=ANTHROPIC_MODEL,
                    api_key=ANTHROPIC_API_KEY,
                    temperature=0.7
                )
                logger.info(f"✅ Anthropic Claude LLM initialized for RAG (model: {ANTHROPIC_MODEL})")
            except Exception as e:
                logger.warning(f"Failed to initialize Anthropic LLM: {e}")
        elif use_llm:
            if not _anthropic_available:
                logger.warning("langchain-anthropic not available. Install with: pip install langchain-anthropic")
            elif not ANTHROPIC_API_KEY:
                logger.warning("ANTHROPIC_API_KEY not found in .env. RAG generation will be disabled.")
        
        logger.info(f"Retrieval chain initialized for collection: {collection_name}")
    
    def retrieve_from_chromadb(self, query: str, top_k: int = 5, filters: dict = None) -> List[Dict]:
        """Retrieve relevant documents from ChromaDB."""
        try:
            # Query ChromaDB
            results = self.vector_store.similarity_search_with_score(
                query,
                k=top_k,
                filter=filters
            )
            
            retrieved_docs = []
            for doc, score in results:
                retrieved_docs.append({
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                    "score": float(score)
                })
            
            logger.info(f"Retrieved {len(retrieved_docs)} documents from ChromaDB")
            return retrieved_docs
        except Exception as e:
            logger.error(f"Error retrieving from ChromaDB: {e}")
            return []
    
    def retrieve_from_neo4j(self, query_type: str, parameters: dict = None) -> List[Dict]:
        """Retrieve data from Neo4j based on query type."""
        try:
            # Define query templates based on query type
            queries = {
                "container_state": """
                    MATCH (c:Container {containerNumber: $containerNumber})
                    OPTIONAL MATCH (c)-[:LOCATED_AT]->(s:Slot)
                    OPTIONAL MATCH (blocker:Container)-[:STACKED_ON*]->(c)
                    RETURN c, s, count(blocker) as blockingCount
                """,
                "available_slots": """
                    MATCH (s:Slot)
                    WHERE s.isOccupied = false 
                    AND s.currentStackHeight < s.maxStackHeight
                    AND s.zoneType = $zoneType
                    RETURN s
                    LIMIT $limit
                """,
                "yard_state": """
                    MATCH (s:Slot)
                    MATCH (s)-[:BELONGS_TO_BLOCK]->(b:Block)
                    RETURN b.blockId, 
                           count(s) as totalSlots,
                           sum(CASE WHEN s.isOccupied THEN 1 ELSE 0 END) as occupiedSlots,
                           avg(s.currentStackHeight) as avgStackHeight
                """
            }
            
            if query_type not in queries:
                logger.warning(f"Unknown query type: {query_type}")
                return []
            
            query = queries[query_type]
            results = neo4j_client.execute_query(query, parameters or {})
            
            logger.info(f"Retrieved {len(results)} results from Neo4j")
            return results
        except Exception as e:
            logger.error(f"Error retrieving from Neo4j: {e}")
            return []
    
    def retrieve_from_sqlite(self, query_type: str, parameters: dict = None) -> List[Dict]:
        """
        Retrieve data from SQLite based on query type.
        
        Args:
            query_type: Type of query (movement_history, vessel_plan, container_details)
            parameters: Query parameters
        
        Returns:
            List of query results
        """
        try:
            if query_type == "movement_history":
                container_id = parameters.get("container_id") if parameters else None
                if not container_id:
                    return []
                
                sql_query = """
                SELECT * FROM containers
                WHERE container_id = ? OR container_number = ?
                ORDER BY event_sequence_number ASC, actual_timestamp ASC
                """
                results = sqlite_client.execute_query(sql_query, (container_id, container_id))
                return results
            
            elif query_type == "vessel_plan":
                vessel_id = parameters.get("vessel_id") if parameters else None
                if not vessel_id:
                    return []
                
                sql_query = """
                SELECT DISTINCT 
                    vessel_id,
                    voyage_id,
                    pod,
                    cutoff_datetime,
                    COUNT(*) as container_count,
                    COUNT(DISTINCT pod) as unique_pods
                FROM containers
                WHERE vessel_id = ?
                GROUP BY vessel_id, voyage_id, pod, cutoff_datetime
                """
                results = sqlite_client.execute_query(sql_query, (vessel_id,))
                return results
            
            elif query_type == "container_details":
                container_id = parameters.get("container_id") if parameters else None
                if not container_id:
                    return []
                
                sql_query = """
                SELECT * FROM containers
                WHERE container_id = ? OR container_number = ?
                ORDER BY event_sequence_number DESC
                LIMIT 1
                """
                results = sqlite_client.execute_query(sql_query, (container_id, container_id))
                return results
            
            else:
                logger.warning(f"Unknown SQLite query type: {query_type}")
                return []
        except Exception as e:
            logger.error(f"Error retrieving from SQLite: {e}")
            return []
    
    def hybrid_retrieve(self, query: str, chromadb_filters: dict = None, 
                       neo4j_query_type: str = None, neo4j_params: dict = None,
                       sqlite_query_type: str = None, sqlite_params: dict = None) -> Dict[str, Any]:
        """
        Hybrid retrieval from ChromaDB, Neo4j, and SQLite.
        
        Args:
            query: Natural language query
            chromadb_filters: Optional filters for ChromaDB
            neo4j_query_type: Optional Neo4j query type
            neo4j_params: Optional Neo4j parameters
            sqlite_query_type: Optional SQLite query type
            sqlite_params: Optional SQLite parameters
        
        Returns:
            Dictionary with results from all databases
        """
        # Retrieve from ChromaDB (knowledge base)
        chromadb_results = self.retrieve_from_chromadb(query, top_k=5, filters=chromadb_filters)
        
        # Retrieve from Neo4j (operational state)
        neo4j_results = []
        if neo4j_query_type:
            neo4j_results = self.retrieve_from_neo4j(neo4j_query_type, neo4j_params)
        
        # Retrieve from SQLite (raw data/audit log)
        sqlite_results = []
        if sqlite_query_type:
            sqlite_results = self.retrieve_from_sqlite(sqlite_query_type, sqlite_params)
        
        return {
            "chromadb_results": chromadb_results,
            "neo4j_results": neo4j_results,
            "sqlite_results": sqlite_results,
            "query": query
        }
    
    def format_context(self, retrieval_results: Dict[str, Any]) -> str:
        """Format retrieval results into context string for LLM."""
        context_parts = []
        
        # Format ChromaDB results (knowledge)
        if retrieval_results.get("chromadb_results"):
            context_parts.append("=== YARD RULES & KNOWLEDGE ===")
            for i, doc in enumerate(retrieval_results["chromadb_results"], 1):
                context_parts.append(f"\n{i}. {doc['content']}")
                if doc.get('metadata'):
                    context_parts.append(f"   Metadata: {doc['metadata']}")
        
        # Format Neo4j results (operational state)
        if retrieval_results.get("neo4j_results"):
            context_parts.append("\n=== YARD STATE (Neo4j) ===")
            for i, result in enumerate(retrieval_results["neo4j_results"], 1):
                context_parts.append(f"\n{i}. {result}")
        
        # Format SQLite results (raw data/audit log)
        if retrieval_results.get("sqlite_results"):
            context_parts.append("\n=== MOVEMENT HISTORY & AUDIT LOG (SQLite) ===")
            for i, result in enumerate(retrieval_results["sqlite_results"], 1):
                # Format key fields only to avoid overwhelming context
                formatted = {
                    "event_type": result.get("event_type"),
                    "movement_type": result.get("movement_type"),
                    "timestamp": result.get("actual_timestamp") or result.get("planned_timestamp"),
                    "from_location": result.get("from_location_id"),
                    "to_location": result.get("to_location_id"),
                    "rehandle_flag": result.get("rehandle_flag")
                }
                context_parts.append(f"\n{i}. {formatted}")
        
        return "\n".join(context_parts)
    
    def route_query(self, query: str) -> Dict[str, Any]:
        """
        Route query to appropriate database(s) based on query content.
        
        Args:
            query: Natural language query
        
        Returns:
            Dictionary with suggested query types and parameters
        """
        query_lower = query.lower()
        routing = {
            "chromadb": False,
            "neo4j": False,
            "sqlite": False,
            "neo4j_query_type": None,
            "neo4j_params": None,
            "sqlite_query_type": None,
            "sqlite_params": None
        }
        
        # Container location queries → Neo4j
        if any(keyword in query_lower for keyword in ["where is", "find container", "locate container", "container position"]):
            routing["neo4j"] = True
            routing["neo4j_query_type"] = "container_state"
            # Extract container ID/number from query
            container_match = re.search(r'(?:container|CNT)[\s-]?([A-Z0-9]+)', query, re.IGNORECASE)
            if container_match:
                routing["neo4j_params"] = {"containerNumber": container_match.group(1)}
        
        # Rules queries → ChromaDB
        elif any(keyword in query_lower for keyword in ["rule", "regulation", "constraint", "hazmat", "stacking", "compatibility"]):
            routing["chromadb"] = True
        
        # Movement history queries → SQLite
        elif any(keyword in query_lower for keyword in ["movement history", "event history", "audit log", "what happened to"]):
            routing["sqlite"] = True
            routing["sqlite_query_type"] = "movement_history"
            # Extract container ID/number
            container_match = re.search(r'(?:container|CNT)[\s-]?([A-Z0-9]+)', query, re.IGNORECASE)
            if container_match:
                routing["sqlite_params"] = {"container_id": container_match.group(1)}
        
        # Vessel queries → SQLite + Neo4j
        elif any(keyword in query_lower for keyword in ["vessel", "voyage", "stowage", "ship"]):
            routing["sqlite"] = True
            routing["neo4j"] = True
            routing["sqlite_query_type"] = "vessel_plan"
            # Extract vessel ID
            vessel_match = re.search(r'(?:vessel|V)[\s-]?([A-Z0-9]+)', query, re.IGNORECASE)
            if vessel_match:
                routing["sqlite_params"] = {"vessel_id": vessel_match.group(1)}
        
        # Yard state queries → Neo4j
        elif any(keyword in query_lower for keyword in ["yard state", "occupancy", "available slots", "utilization"]):
            routing["neo4j"] = True
            routing["neo4j_query_type"] = "yard_state"
            # Extract zone if mentioned
            if "export" in query_lower:
                routing["neo4j_params"] = {"zoneType": "Export"}
            elif "import" in query_lower:
                routing["neo4j_params"] = {"zoneType": "Import"}
        
        # Blocking analysis → Neo4j
        elif any(keyword in query_lower for keyword in ["blocking", "blocked by", "need to move"]):
            routing["neo4j"] = True
            routing["neo4j_query_type"] = "container_state"
            container_match = re.search(r'(?:container|CNT)[\s-]?([A-Z0-9]+)', query, re.IGNORECASE)
            if container_match:
                routing["neo4j_params"] = {"containerNumber": container_match.group(1)}
        
        # Placement recommendations → All databases (hybrid)
        elif any(keyword in query_lower for keyword in ["where should", "recommend", "optimal", "placement", "place container"]):
            routing["chromadb"] = True
            routing["neo4j"] = True
            routing["sqlite"] = True
            routing["neo4j_query_type"] = "available_slots"
            if "export" in query_lower:
                routing["neo4j_params"] = {"zoneType": "Export", "limit": 10}
            elif "import" in query_lower:
                routing["neo4j_params"] = {"zoneType": "Import", "limit": 10}
            else:
                routing["neo4j_params"] = {"zoneType": "General", "limit": 10}
        
        # Default: search rules (ChromaDB)
        else:
            routing["chromadb"] = True
        
        return routing
    
    def rag_chain(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        """
        Run RAG chain with Anthropic Claude: retrieve + generate.
        
        Args:
            query: User query
            top_k: Number of documents to retrieve
            
        Returns:
            Dictionary with retrieved documents and LLM response
        """
        if not self.llm:
            logger.warning("LLM not available. Returning retrieval results only.")
            results = self.hybrid_retrieve(query)
            return {
                "query": query,
                "retrieval_results": results,
                "llm_response": None,
                "error": "LLM not available. Add ANTHROPIC_API_KEY to .env file"
            }
        
        try:
            # Retrieve relevant documents
            docs = self.retrieve_from_chromadb(query, top_k=top_k)
            
            if not docs:
                return {
                    "query": query,
                    "retrieval_results": {"chromadb_results": [], "neo4j_results": []},
                    "llm_response": "No relevant documents found.",
                    "error": None
                }
            
            # Format context
            context = "\n\n".join([doc['content'] for doc in docs])
            
            # Create prompt template
            prompt_template = PromptTemplate(
                input_variables=["context", "question"],
                template="""You are an expert container yard operations assistant. Use the following context to answer the question accurately and helpfully.

CONTEXT:
{context}

QUESTION: {question}

Provide a clear, detailed answer based on the context above. If the context doesn't contain enough information, say so."""
            )
            
            # Generate response using Anthropic Claude
            prompt = prompt_template.format(context=context, question=query)
            response = self.llm.invoke(prompt)
            
            llm_response = response.content if hasattr(response, 'content') else str(response)
            
            return {
                "query": query,
                "retrieval_results": {
                    "chromadb_results": docs,
                    "neo4j_results": []
                },
                "llm_response": llm_response,
                "error": None
            }
        except Exception as e:
            logger.error(f"Error in RAG chain: {e}")
            return {
                "query": query,
                "retrieval_results": {"chromadb_results": [], "neo4j_results": []},
                "llm_response": None,
                "error": str(e)
            }


# Global retrieval chain instance
retrieval_chain = HybridRetrievalChain()


class OrchestratorAgent:
    """
    LangChain orchestrator agent that uses all tools to answer queries.
    Routes queries to appropriate tools based on query type.
    """
    
    def __init__(self, use_agent: bool = True):
        """
        Initialize orchestrator agent.
        
        Args:
            use_agent: Whether to use LangChain agent (requires LLM), or simple routing
        """
        self.use_agent = use_agent
        self.llm = None
        self.agent = None
        self.retrieval_chain = HybridRetrievalChain(use_llm=use_agent)
        
        if use_agent:
            self._initialize_agent()
    
    def _initialize_agent(self):
        """Initialize LangChain agent with all tools."""
        try:
            from src.rag.agent_tools import ALL_TOOLS
            
            if not self.retrieval_chain.llm:
                logger.warning("LLM not available. Agent will use simple routing instead.")
                self.use_agent = False
                return
            
            # Initialize agent with tools
            self.agent = initialize_agent(
                tools=ALL_TOOLS,
                llm=self.retrieval_chain.llm,
                agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
                verbose=True,
                handle_parsing_errors=True
            )
            logger.info("✅ Orchestrator agent initialized with all tools")
        except ImportError as e:
            logger.warning(f"Could not import agent tools: {e}. Using simple routing.")
            self.use_agent = False
        except Exception as e:
            logger.error(f"Failed to initialize agent: {e}")
            self.use_agent = False
    
    def query(self, user_query: str) -> Dict[str, Any]:
        """
        Process user query using agent or simple routing.
        
        Args:
            user_query: Natural language query
        
        Returns:
            Dictionary with query results and response
        """
        if self.use_agent and self.agent:
            # Use LangChain agent
            try:
                response = self.agent.run(user_query)
                return {
                    "query": user_query,
                    "response": response,
                    "method": "agent",
                    "tools_used": "multiple (agent-selected)"
                }
            except Exception as e:
                logger.error(f"Agent execution error: {e}")
                # Fall back to simple routing
                return self._simple_route(user_query)
        else:
            # Use simple routing
            return self._simple_route(user_query)
    
    def _simple_route(self, user_query: str) -> Dict[str, Any]:
        """
        Simple query routing without agent (fallback).
        
        Args:
            user_query: Natural language query
        
        Returns:
            Dictionary with query results
        """
        # Route query
        routing = self.retrieval_chain.route_query(user_query)
        
        # Execute hybrid retrieval
        results = self.retrieval_chain.hybrid_retrieve(
            query=user_query,
            neo4j_query_type=routing.get("neo4j_query_type"),
            neo4j_params=routing.get("neo4j_params"),
            sqlite_query_type=routing.get("sqlite_query_type"),
            sqlite_params=routing.get("sqlite_params")
        )
        
        # Format context
        context = self.retrieval_chain.format_context(results)
        
        # Generate response if LLM available
        llm_response = None
        if self.retrieval_chain.llm:
            try:
                prompt = f"""You are an expert container yard operations assistant. Answer the following question based on the context provided.

CONTEXT:
{context}

QUESTION: {user_query}

Provide a clear, detailed answer. If the context doesn't contain enough information, say so."""
                
                response = self.retrieval_chain.llm.invoke(prompt)
                llm_response = response.content if hasattr(response, 'content') else str(response)
            except Exception as e:
                logger.error(f"LLM generation error: {e}")
        
        return {
            "query": user_query,
            "response": llm_response or context,
            "method": "simple_routing",
            "routing": routing,
            "results": {
                "chromadb_count": len(results.get("chromadb_results", [])),
                "neo4j_count": len(results.get("neo4j_results", [])),
                "sqlite_count": len(results.get("sqlite_results", []))
            },
            "context": context
        }


# Global orchestrator agent instance
orchestrator_agent = OrchestratorAgent(use_agent=True)

