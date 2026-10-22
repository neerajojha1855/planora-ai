from abc import ABC, abstractmethod
from typing import Any
from ..schemas.event import EventBriefCreate
from ..schemas.plan import GeneratedPlanContent

class AIPlanner(ABC):
    """Abstract interface defining the GenAI planning service."""

    @abstractmethod
    async def generate_plan(self, brief: EventBriefCreate) -> tuple[GeneratedPlanContent, dict[str, Any]]:
        """Generate a complete event plan. Returns (plan_content, generation_metadata)."""
        pass

    @abstractmethod
    async def regenerate_section(self, brief: EventBriefCreate, current_plan: GeneratedPlanContent, section_name: str, instruction: str | None=None) -> tuple[Any, dict[str, Any]]:
        """Regenerates a single targeted section while keeping other sections intact."""
        pass