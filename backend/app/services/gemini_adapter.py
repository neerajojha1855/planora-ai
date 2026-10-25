import json
import logging
import time
from typing import Any
import httpx
from pydantic import ValidationError

from ..config import get_settings
from ..schemas.event import EventBriefCreate
from ..schemas.plan import (
    BudgetBreakdown,
    GeneratedPlanContent,
    PersonalizedIdea,
    TimelineMilestone,
    VendorChecklistItem,
)
from .ai_planner import AIPlanner
from .mock_adapter import MockAIPlanner
from .prompts import PLANNER_SYSTEM_PROMPT, SECTION_REGENERATION_PROMPT

logger = logging.getLogger("planora.ai")
settings = get_settings()


class GeminiAdapter(AIPlanner):
    """Direct Google Gemini API adapter using responseMimeType: application/json."""

    def __init__(self):
        self.api_key = settings.gemini_api_key
        self.model = settings.gemini_model_name
        self.timeout = settings.ai_request_timeout_seconds
        self.max_retries = settings.ai_max_retries

    async def _call_gemini(self, prompt_text: str) -> str:
        """Dispatches an asynchronous request to Gemini with JSON generationConfig enforced."""
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
            f"?key={self.api_key}"
        )
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt_text}]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.7,
            },
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

    async def generate_plan(
        self, brief: EventBriefCreate
    ) -> tuple[GeneratedPlanContent, dict[str, Any]]:
        """Synthesizes an end-to-end event plan with schema validation and automatic mock fallback."""

        full_prompt = (
            f"{PLANNER_SYSTEM_PROMPT}\n\n"
            f"EVENT BRIEF:\n"
            f"- Title: {brief.title}\n"
            f"- Event Type: {brief.event_type.value}\n"
            f"- Date: {brief.event_date.isoformat()}\n"
            f"- Location: {brief.location}\n"
            f"- Guests: {brief.guest_count}\n"
            f"- Budget: {brief.budget_amount} {brief.budget_currency}\n"
            f"- Priorities: {', '.join(brief.priorities) if brief.priorities else 'None specified'}\n"
            f"- Style: {brief.style or 'Flexible'}\n"
            f"- Dietary / Accessibility: {brief.dietary_accessibility_notes or 'None'}\n"
            f"- Additional Notes: {brief.additional_context or 'None'}\n\n"
            f"Respond with pure JSON matching the celebration plan schema."
        )

        start_time = time.time()
        last_exception = None

        for attempt in range(1, self.max_retries + 2):
            try:
                raw_json = await self._call_gemini(full_prompt)
                parsed_plan = GeneratedPlanContent.model_validate_json(raw_json)
                latency = round(time.time() - start_time, 2)
                metadata = {
                    "model": self.model,
                    "provider": "google_gemini",
                    "latency_seconds": latency,
                    "attempts": attempt,
                }
                return parsed_plan, metadata
            except (httpx.HTTPError, ValidationError, json.JSONDecodeError, KeyError) as e:
                last_exception = e
                logger.warning(f"Gemini generation attempt {attempt} failed: {e}")
                if attempt > self.max_retries:
                    break

        logger.warning(
            f"Gemini unavailable ({last_exception}). Falling back to internal planner."
        )
        fallback_plan, fallback_meta = await MockAIPlanner().generate_plan(brief)
        fallback_meta["fallback_reason"] = str(last_exception)
        return fallback_plan, fallback_meta

    async def regenerate_section(
        self,
        brief: EventBriefCreate,
        current_plan: GeneratedPlanContent,
        section_name: str,
        instruction: str | None = None,
    ) -> tuple[Any, dict[str, Any]]:
        """Selectively re-prompts Gemini to refine a specific section without mutating other plan state."""
        user_prompt = SECTION_REGENERATION_PROMPT.format(

            section_name=section_name,
            title=brief.title,
            event_type=brief.event_type.value,
            budget_amount=brief.budget_amount,
            budget_currency=brief.budget_currency,
            guest_count=brief.guest_count,
            location=brief.location,
            instruction_clause=f"Specific User Request: {instruction}" if instruction else "",
            current_section_json=json.dumps(getattr(current_plan, section_name).model_dump() if hasattr(getattr(current_plan, section_name), "model_dump") else [item.model_dump() for item in getattr(current_plan, section_name)]),
        )

        start_time = time.time()
        for attempt in range(1, self.max_retries + 2):
            try:
                raw_json = await self._call_gemini(user_prompt)
                parsed_json = json.loads(raw_json)

                if section_name == "budget":
                    parsed = BudgetBreakdown.model_validate(parsed_json)
                elif section_name == "timeline":
                    items = parsed_json if isinstance(parsed_json, list) else parsed_json.get("timeline", [])
                    parsed = [TimelineMilestone.model_validate(item) for item in items]
                elif section_name == "vendor_checklist":
                    items = parsed_json if isinstance(parsed_json, list) else parsed_json.get("vendor_checklist", [])
                    parsed = [VendorChecklistItem.model_validate(item) for item in items]
                elif section_name == "personalized_ideas":
                    items = parsed_json if isinstance(parsed_json, list) else parsed_json.get("personalized_ideas", [])
                    parsed = [PersonalizedIdea.model_validate(item) for item in items]
                else:
                    raise ValueError(f"Unknown section: {section_name}")

                latency = round(time.time() - start_time, 2)
                metadata = {
                    "model": self.model,
                    "provider": "google_gemini",
                    "section": section_name,
                    "latency_seconds": latency,
                    "attempts": attempt,
                }
                return parsed, metadata
            except Exception as e:
                logger.warning(f"Gemini regeneration attempt {attempt} failed: {e}")
                if attempt > self.max_retries:
                    break

        return await MockAIPlanner().regenerate_section(brief, current_plan, section_name, instruction)
