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
from .prompts import PLANNER_SYSTEM_PROMPT, SECTION_REGENERATION_PROMPT

logger = logging.getLogger("planora.ai")
settings = get_settings()


class OpenRouterAdapter(AIPlanner):
    """External AI adapter calling OpenRouter API with retries, timeouts, and JSON validation."""

    def __init__(self):
        self.api_key = settings.openrouter_api_key
        self.model = settings.openrouter_model_name
        self.base_url = settings.openrouter_base_url.rstrip("/")
        self.timeout = settings.ai_request_timeout_seconds
        self.max_retries = settings.ai_max_retries

    async def _call_llm(self, messages: list[dict[str, str]]) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://planora.ai",
            "X-Title": "Planora Event Planner",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7,
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def generate_plan(
        self, brief: EventBriefCreate
    ) -> tuple[GeneratedPlanContent, dict[str, Any]]:
        user_prompt = (
            f"Please generate a complete event plan for:\n"
            f"- Title: {brief.title}\n"
            f"- Event Type: {brief.event_type.value}\n"
            f"- Date: {brief.event_date.isoformat()}\n"
            f"- Location: {brief.location}\n"
            f"- Guests: {brief.guest_count}\n"
            f"- Budget: {brief.budget_amount} {brief.budget_currency}\n"
            f"- Priorities: {', '.join(brief.priorities) if brief.priorities else 'None specified'}\n"
            f"- Style: {brief.style or 'Flexible'}\n"
            f"- Dietary / Accessibility: {brief.dietary_accessibility_notes or 'None'}\n"
            f"- Additional Notes: {brief.additional_context or 'None'}"
        )
        messages = [
            {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        start_time = time.time()
        last_exception = None

        for attempt in range(1, self.max_retries + 2):
            try:
                raw_json = await self._call_llm(messages)
                parsed_plan = GeneratedPlanContent.model_validate_json(raw_json)
                latency = round(time.time() - start_time, 2)
                metadata = {
                    "model": self.model,
                    "provider": "openrouter",
                    "latency_seconds": latency,
                    "attempts": attempt,
                }
                return parsed_plan, metadata
            except (httpx.HTTPError, ValidationError, json.JSONDecodeError, KeyError) as e:
                last_exception = e
                logger.warning(f"AI generation attempt {attempt} failed: {e}")
                if attempt > self.max_retries:
                    break

        raise RuntimeError(f"AI generation failed after retries: {last_exception}")

    async def regenerate_section(
        self,
        brief: EventBriefCreate,
        current_plan: GeneratedPlanContent,
        section_name: str,
        instruction: str | None = None,
    ) -> tuple[Any, dict[str, Any]]:
        user_prompt = SECTION_REGENERATION_PROMPT.format(
            section_name=section_name,
            title=brief.title,
            event_type=brief.event_type.value,
            budget_amount=brief.budget_amount,
            budget_currency=brief.budget_currency,
            guest_count=brief.guest_count,
            location=brief.location,
            priorities=", ".join(brief.priorities),
            style=brief.style or "Default",
            instruction=instruction or "Refresh with creative alternative choices.",
        )
        messages = [
            {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        start_time = time.time()
        raw_json = await self._call_llm(messages)
        parsed_dict = json.loads(raw_json)

        # Validate section specifically
        if section_name == "budget":
            data = BudgetBreakdown.model_validate(parsed_dict.get("budget", parsed_dict))
        elif section_name == "timeline":
            items = parsed_dict.get("timeline", parsed_dict)
            data = [TimelineMilestone.model_validate(it) for it in items]
        elif section_name == "vendor_checklist":
            items = parsed_dict.get("vendor_checklist", parsed_dict)
            data = [VendorChecklistItem.model_validate(it) for it in items]
        elif section_name == "personalized_ideas":
            items = parsed_dict.get("personalized_ideas", parsed_dict)
            data = [PersonalizedIdea.model_validate(it) for it in items]
        else:
            raise ValueError(f"Unknown section: {section_name}")

        metadata = {
            "model": self.model,
            "section": section_name,
            "latency_seconds": round(time.time() - start_time, 2),
        }
        return data, metadata
