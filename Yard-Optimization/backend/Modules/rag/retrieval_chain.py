"""LangChain-based retrieval chain for querying ChromaDB and Neo4j."""
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.prompts import PromptTemplate
from typing import List, Dict, Any, Optional
import logging
from Modules.database.chroma_client import chroma_client
from Modules.database.neo4j_client import neo4j_client
from Modules.config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL

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
                    anthropic_api_key=ANTHROPIC_API_KEY,
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

    def hybrid_retrieve(self, query: str, chromadb_filters: dict = None, neo4j_query_type: str = None, neo4j_params: dict = None) -> Dict[str, Any]:
        """Hybrid retrieval from both ChromaDB and Neo4j."""
        # Retrieve from ChromaDB (knowledge base)
        chromadb_results = self.retrieve_from_chromadb(query, top_k=5, filters=chromadb_filters)

        # Retrieve from Neo4j (operational state)
        neo4j_results = []
        if neo4j_query_type:
            neo4j_results = self.retrieve_from_neo4j(neo4j_query_type, neo4j_params)

        return {
            "chromadb_results": chromadb_results,
            "neo4j_results": neo4j_results,
            "query": query
        }

    def format_context(self, retrieval_results: Dict[str, Any]) -> str:
        """Format retrieval results into context string for LLM."""
        context_parts = []

        # Format ChromaDB results (knowledge)
        if retrieval_results["chromadb_results"]:
            context_parts.append("=== YARD RULES & KNOWLEDGE ===")
            for i, doc in enumerate(retrieval_results["chromadb_results"], 1):
                context_parts.append(f"\n{i}. {doc['content']}")
                if doc.get('metadata'):
                    context_parts.append(f"   Metadata: {doc['metadata']}")

        # Format Neo4j results (operational state)
        if retrieval_results["neo4j_results"]:
            context_parts.append("\n=== YARD STATE ===")
            for i, result in enumerate(retrieval_results["neo4j_results"], 1):
                context_parts.append(f"\n{i}. {result}")

        return "\n".join(context_parts)

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
