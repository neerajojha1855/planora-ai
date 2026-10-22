from typing import Any
from ..schemas.event import EventBriefCreate
from ..schemas.plan import GeneratedPlanContent
from .ai_planner import AIPlanner
from ..routers.plans import _generate_stub_plan


class MockAIPlanner(AIPlanner):
    """Deterministic, fast mock AI adapter for tests and local development."""

    async def generate_plan(
        self, brief: EventBriefCreate
    ) -> tuple[GeneratedPlanContent, dict[str, Any]]:
        plan = _generate_stub_plan(brief)
        metadata = {
            "model": "mock-ai-planner",
            "provider": "mock",
            "latency_seconds": 0.01,
            "attempts": 1,
        }
        return plan, metadata

    async def regenerate_section(
        self,
        brief: EventBriefCreate,
        current_plan: GeneratedPlanContent,
        section_name: str,
        instruction: str | None = None,
    ) -> tuple[Any, dict[str, Any]]:
        fresh_plan = _generate_stub_plan(brief)
        if section_name == "budget":
            data = fresh_plan.budget
        elif section_name == "timeline":
            data = fresh_plan.timeline
        elif section_name == "vendor_checklist":
            data = fresh_plan.vendor_checklist
        elif section_name == "personalized_ideas":
            data = fresh_plan.personalized_ideas
        else:
            raise ValueError(f"Unknown section: {section_name}")

        return data, {"model": "mock-ai-planner", "section": section_name}
