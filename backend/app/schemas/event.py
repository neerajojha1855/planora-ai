from datetime import date
from enum import Enum
from typing import Annotated
from pydantic import BaseModel, Field, field_validator

class EventType(str, Enum):
    WEDDING = "wedding"
    BIRTHDAY = "birthday"
    COMMUNITY = "community"

class EventBriefBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=120, description="Name or title of the event celebration")
    event_type: EventType = Field(..., description="Target category: wedding, birthday or community event")
    event_date: date = Field(..., description="Target date of the event (must be current or future)")
    location: str = Field(..., min_length=2, max_length=150, description="City, venue or region")
    guest_count: int = Field(..., ge=1, le=50000, description="Estimated total number of attendees")
    budget_amount: float = Field(..., ge=0, le=100000000.0, description="Total designated budget")
    budget_currency: str = Field(default="INR", pattern=r"^[A-Z]{3}$", description="3 letter ISO currency code")
    priorities: list[Annotated[str, Field(max_length=100)]] = Field(default_factory=list, max_length=10, description="Key user priorities (e.g. photography, gourmet food, live band)")
    style: str | None = Field(default=None, max_length=200, description="Atmosphere or aesthetic theme")
    dietary_accessibility_notes: str | None = Field(default=None, max_length=1000, description="Dietary restrictions or accessibility requirements")
    additional_context: str | None = Field(default=None, max_length=2000, description="Any specific constraints, dreams or custom traditions")

    @field_validator("event_date")
    @classmethod
    def validate_future_date(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("Event date cannoot be in the past.")
        
        return v

class EventBriefCreate(EventBriefBase):
    pass

class EventBriefResponse(EventBriefBase):
    pass