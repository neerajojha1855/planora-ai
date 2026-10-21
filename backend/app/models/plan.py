import uuid
from datetime import date, datetime
from typing import Any
from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..db import Base


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    guest_count: Mapped[int] = mapped_column(Integer, nullable=False)
    budget_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    budget_currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    priorities: Mapped[list[Any]] = mapped_column(JSONB, default=list, nullable=False)
    style: Mapped[str | None] = mapped_column(String(255), nullable=True)
    dietary_accessibility_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    additional_context: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(50), default="completed", index=True, nullable=False)
    plan_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    generation_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True, nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="plans")
