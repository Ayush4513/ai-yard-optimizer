"""LLM client for Anthropic Claude (using LangChain)."""
from typing import Optional
import logging
from Modules.config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL

logger = logging.getLogger(__name__)

# Lazy imports to avoid errors if packages not installed
_langchain_anthropic_available = False

try:
    from langchain_anthropic import ChatAnthropic
    _langchain_anthropic_available = True
except ImportError:
    logger.warning("langchain-anthropic not available. Install with: pip install langchain-anthropic")


class LLMClient:
    """LLM client wrapper for Anthropic Claude using LangChain."""

    def __init__(self, model: Optional[str] = None):
        """
        Initialize Anthropic Claude LLM client.

        Args:
            model: Model name (optional, uses default from config)
        """
        self.model = model
        self.llm = None
        self._initialize()

    def _initialize(self):
        """Initialize Anthropic Claude LLM."""
        if not ANTHROPIC_API_KEY:
            logger.warning("Anthropic API key not found. Add ANTHROPIC_API_KEY to .env file")
            return

        if not _langchain_anthropic_available:
            logger.error("langchain-anthropic not installed. Run: pip install langchain-anthropic")
            return

        model_name = self.model or ANTHROPIC_MODEL
        try:
            self.llm = ChatAnthropic(
                model=model_name,
                anthropic_api_key=ANTHROPIC_API_KEY,
                temperature=0.7,
                max_tokens=2048
            )
            logger.info(f"✅ Anthropic Claude initialized: {model_name}")
        except Exception as e:
            logger.error(f"Failed to initialize Anthropic: {e}")

    def is_available(self) -> bool:
        """Check if LLM is available."""
        return self.llm is not None

    def generate(self, prompt: str, **kwargs) -> str:
        """
        Generate text using the LLM.

        Args:
            prompt: Input prompt
            **kwargs: Additional parameters for LLM

        Returns:
            Generated text
        """
        if not self.llm:
            raise RuntimeError("LLM not initialized. Check ANTHROPIC_API_KEY in .env file")

        try:
            response = self.llm.invoke(prompt, **kwargs)
            return response.content if hasattr(response, 'content') else str(response)
        except Exception as e:
            logger.error(f"LLM generation error: {e}")
            raise

    def generate_with_context(self, context: str, query: str, **kwargs) -> str:
        """
        Generate text with context (RAG pattern).

        Args:
            context: Retrieved context from RAG
            query: User query
            **kwargs: Additional parameters

        Returns:
            Generated text
        """
        full_prompt = f"""You are a container yard optimization assistant. Use the following context to answer the query.

CONTEXT:
{context}

QUERY:
{query}

Provide a detailed, accurate answer based on the context above."""

        return self.generate(full_prompt, **kwargs)


# Global LLM client instance
anthropic_client = LLMClient()

# Default client (Anthropic Claude)
def get_default_llm():
    """Get default LLM client (Anthropic Claude)."""
    if anthropic_client.is_available():
        return anthropic_client
    else:
        logger.warning("No LLM available. Add ANTHROPIC_API_KEY to .env file")
        return None
