"""Anthropic Claude LLM service for generation and reasoning."""
from typing import Optional, Dict, Any
import logging
from src.config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL

logger = logging.getLogger(__name__)

# Try to import Anthropic - handle gracefully if not available
try:
    from langchain_anthropic import ChatAnthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    logger.warning("langchain-anthropic not installed. Install with: pip install langchain-anthropic")
    ANTHROPIC_AVAILABLE = False
    ChatAnthropic = None


class AnthropicService:
    """Anthropic Claude LLM service wrapper."""
    
    def __init__(self, api_key: Optional[str] = None, model: str = None):
        """Initialize Anthropic service."""
        if not ANTHROPIC_AVAILABLE:
            logger.warning("Anthropic package not available. LLM features disabled.")
            self.llm = None
            return
        
        self.api_key = api_key or ANTHROPIC_API_KEY
        self.model = model or ANTHROPIC_MODEL
        
        if not self.api_key:
            logger.warning("Anthropic API key not provided. LLM features will be disabled.")
            logger.info("💡 Add ANTHROPIC_API_KEY to .env file to enable Claude LLM")
            self.llm = None
        else:
            try:
                self.llm = ChatAnthropic(
                    model=self.model,
                    temperature=0.7,
                    api_key=self.api_key
                )
                logger.info(f"✅ Anthropic Claude initialized (model: {self.model})")
            except Exception as e:
                logger.error(f"Failed to initialize Anthropic: {e}")
                self.llm = None
    
    def is_available(self) -> bool:
        """Check if LLM is available."""
        return self.llm is not None and ANTHROPIC_AVAILABLE
    
    def generate(self, prompt: str, system_prompt: str = None) -> str:
        """Generate text using Claude."""
        if not self.is_available():
            raise ValueError("Anthropic LLM not available. Check API key in .env")
        
        try:
            if system_prompt:
                response = self.llm.invoke([
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ])
            else:
                response = self.llm.invoke([{"role": "user", "content": prompt}])
            
            return response.content
        except Exception as e:
            logger.error(f"Anthropic generation error: {e}")
            raise
    
    def generate_with_context(self, query: str, context: str, system_prompt: str = None) -> str:
        """Generate with RAG context."""
        if not self.is_available():
            raise ValueError("Anthropic LLM not available. Check API key in .env")
        
        full_prompt = f"""
{context}

Based on the above context, answer the following query:

{query}
"""
        
        return self.generate(full_prompt, system_prompt)
    
    def explain_recommendation(self, recommendation: Dict[str, Any], context: str) -> str:
        """Generate explanation for a recommendation."""
        system_prompt = """You are an expert container yard operations analyst. 
Explain stacking recommendations in clear, actionable language for terminal operators."""
        
        prompt = f"""
Given this stacking recommendation:
- Slot: {recommendation.get('slotId', 'N/A')}
- Confidence: {recommendation.get('confidence', 0)}
- Rehandle Risk: {recommendation.get('rehandleRisk', 0)}

Context:
{context}

Provide a clear explanation of why this slot was recommended, including:
1. Key factors that influenced the decision
2. Expected benefits (rehandle reduction, efficiency gains)
3. Any risks or considerations
"""
        
        return self.generate(prompt, system_prompt)


# Global Anthropic service instance
anthropic_service = AnthropicService()

