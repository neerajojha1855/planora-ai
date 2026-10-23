import uuid
from datetime import datetime
from enum import Enum
from typing import Literal
from pydantic import BaseModel, Field
from .event import EventBriefCreate


class PlanStatus(str, Enum):
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class BudgetItem(BaseModel):
    category: str = Field(..., description="Category: Venue, Catering, Decor, Entertainment, Logistics, etc.")
    item_name: str = Field(..., description="Specific expense item")
    estimated_cost: float = Field(..., ge=0)
    actual_cost: float | None = Field(default=None, ge=0)
    priority: Literal["high", "medium", "low"] = "medium"
    notes: str | None = None


class BudgetBreakdown(BaseModel):
    total_budget: float = Field(..., ge=0)
    allocated_budget: float = Field(..., ge=0)
    contingency_reserve: float = Field(..., ge=0)
    currency: str = "USD"
    categories: list[str] = Field(default_factory=list)
    items: list[BudgetItem] = Field(default_factory=list)


class TimelineMilestone(BaseModel):
    phase: str = Field(..., description="Timeline phase (e.g., '6-9 Months Out', 'Event Day')")
    title: str = Field(...)
    description: str = Field(...)
    due_date_offset_days: int = Field(..., description="Relative offset in days prior to event")
    status: Literal["upcoming", "in_progress", "completed"] = "upcoming"


class VendorChecklistItem(BaseModel):
    category: str = Field(...)
    role: str = Field(..., description="Vendor role (e.g., Photographer, Caterer, A/V Technician)")
    description: str = Field(...)
    estimated_budget: float = Field(..., ge=0)
    booking_deadline_weeks: int = Field(..., ge=0, description="Recommended lead time in weeks")
    questions_to_ask: list[str] = Field(default_factory=list)
    status: Literal["to_research", "contacted", "booked", "not_needed"] = "to_research"


class PersonalizedIdea(BaseModel):
    category: str = Field(..., description="Theme, Entertainment, Guest Experience, Favors, etc.")
    title: str = Field(...)
    description: str = Field(...)
    estimated_cost_tier: Literal["budget", "moderate", "splurge"] = "moderate"
    diy_friendly: bool = False


class GeneratedPlanContent(BaseModel):
    summary: str = Field(..., description="Executive vision and strategic summary for the celebration")
    budget: BudgetBreakdown
    timeline: list[TimelineMilestone]
    vendor_checklist: list[VendorChecklistItem]
    personalized_ideas: list[PersonalizedIdea]
    assumptions: list[str] = Field(default_factory=list)
    next_actions: list[str] = Field(default_factory=list)


class PlanResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    event_type: str
    status: PlanStatus
    event_brief: EventBriefCreate
    plan_data: GeneratedPlanContent | None = None
    created_at: datetime
    updated_at: datetime | None = None

class PlanUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=150)
    plan_data: GeneratedPlanContent | None = None

class SectionRegenerateRequest(BaseModel):
    section: Literal["budget", "timeline", "vendor_checklist", "personalized_ideas"] | None = None
    refinement_instruction: str | None = Field(default=None, max_length=500)
