import sys
import asyncio
import pytest

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.main import app
from app.services.factory import get_ai_planner
from app.services.mock_adapter import MockAIPlanner


@pytest.fixture(autouse=True)
def override_ai_planner():
    """Ensures test suite always uses MockAIPlanner without external network calls."""
    app.dependency_overrides[get_ai_planner] = lambda: MockAIPlanner()
    yield
    app.dependency_overrides.pop(get_ai_planner, None)
