from functools import lru_cache
from ..config import get_settings
from .ai_planner import AIPlanner
from .mock_adapter import MockAIPlanner
from .openrouter_adapter import OpenRouterAdapter

settings = get_settings()

@lru_cache
def get_ai_planner() -> AIPlanner:
    """Returns OpenRouterAdapter if API key configured, otherwise MockAIPlanner."""
    if settings.openrouter_api_key and settings.environment != "test":
        return OpenRouterAdapter()
    return MockAIPlanner()