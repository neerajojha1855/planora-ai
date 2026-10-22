import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..core.deps import get_current_user
from ..db import get_session
from ..models import Plan as PlanModel, User
from ..schemas.event import EventBriefCreate
from ..schemas.plan import (
    GeneratedPlanContent,
    PlanResponse,
    PlanStatus,
    SectionRegenerateRequest
)
from ..services.ai_planner import AIPlanner
from ..services.factory import get_ai_planner

router = APIRouter(prefix="/plans", tags=["Plans"])

@router.post("", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(brief: EventBriefCreate, current_user: User=Depends(get_current_user), ai_planner: AIPlanner=Depends(get_ai_planner), db: AsyncSession=Depends(get_session)) -> PlanResponse:
    plan_id = uuid.uuid4()
    plan_record = PlanModel(
        id=plan_id,
        user_id=current_user.id,
        title=brief.title,
        event_type=brief.event_type.value,
        event_date=brief.event_date,
        location=brief.location,
        guest_count=brief.guest_count,
        budget_amount=brief.budget_amount,
        budget_currency=brief.budget_currency,
        priorities=brief.priorities,
        style=brief.style,
        dietary_accessibility_notes=brief.dietary_accessibility_notes,
        additional_context=brief.additional_context,
        status="generating",
    )
    db.add(plan_record)
    await db.commit()

    try:
        plan_content, metadata = await ai_planner.generate_plan(brief)
        plan_record.plan_data = plan_content.model_dump()
        plan_record.generation_metadata = metadata
        plan_record.status = "completed"
        await db.commit()
        await db.refresh(plan_record)
    except Exception as e:
        plan_record.status = "failed"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI generation was unable to complete. Please retry.",
        ) from e
    return PlanResponse(
        id=plan_record.id,
        user_id=plan_record.user_id,
        title=plan_record.title,
        event_type=plan_record.event_type,
        status=PlanStatus.COMPLETED,
        event_brief=brief,
        plan_data=plan_content,
        created_at=plan_record.created_at,
        updated_at=plan_record.updated_at,
    )

@router.get("", response_model=list[PlanResponse])
async def list_user_plans(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_session)) -> list[PlanResponse]:
    """Lists all saved plans owned by the authenticated user."""
    stmt = (
        select(PlanModel)
        .where(PlanModel.user_id == current_user.id)
        .order_by(PlanModel.created_at.desc())
    )
    plans = (await db.execute(stmt)).scalars().all()
    results = []
    for p in plans:
        brief = EventBriefCreate(
            title=p.title,
            event_type=p.event_type,
            event_date=p.event_date,
            location=p.location,
            guest_count=p.guest_count,
            budget_amount=float(p.budget_amount),
            budget_currency=p.budget_currency,
            priorities=p.priorities,
            style=p.style,
            dietary_accessibility_notes=p.dietary_accessibility_notes,
            additional_context=p.additional_context,
        )
        plan_data = GeneratedPlanContent.model_validate(p.plan_data) if p.plan_data else None
        results.append(
            PlanResponse(
                id=p.id,
                user_id=p.user_id,
                title=p.title,
                event_type=p.event_type,
                status=PlanStatus(p.status),
                event_brief=brief,
                plan_data=plan_data,
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
        )
    return results

@router.get("/{plan_id}", response_model=PlanResponse)
async def get_plan(
    plan_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> PlanResponse:
    """Retrieves a specific plan. Strictly enforces ownership: returns 404 for unauthorized plans."""
    stmt = select(PlanModel).where(
        PlanModel.id == plan_id,
        PlanModel.user_id == current_user.id,
    )
    plan_record = (await db.execute(stmt)).scalar_one_or_none()
    if not plan_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found.")
    brief = EventBriefCreate(
        title=plan_record.title,
        event_type=plan_record.event_type,
        event_date=plan_record.event_date,
        location=plan_record.location,
        guest_count=plan_record.guest_count,
        budget_amount=float(plan_record.budget_amount),
        budget_currency=plan_record.budget_currency,
        priorities=plan_record.priorities,
        style=plan_record.style,
        dietary_accessibility_notes=plan_record.dietary_accessibility_notes,
        additional_context=plan_record.additional_context,
    )
    plan_data = (
        GeneratedPlanContent.model_validate(plan_record.plan_data)
        if plan_record.plan_data
        else None
    )
    
    return PlanResponse(
        id=plan_record.id,
        user_id=plan_record.user_id,
        title=plan_record.title,
        event_type=plan_record.event_type,
        status=PlanStatus(plan_record.status),
        event_brief=brief,
        plan_data=plan_data,
        created_at=plan_record.created_at,
        updated_at=plan_record.updated_at,
    )

@router.post("/{plan_id}/regenerate/{section}", response_model=PlanResponse)
async def regenerate_plan_section(
    plan_id: uuid.UUID,
    section: str,
    payload: SectionRegenerateRequest | None = None,
    current_user: User = Depends(get_current_user),
    ai_planner: AIPlanner = Depends(get_ai_planner),
    db: AsyncSession = Depends(get_session),
) -> PlanResponse:
    """Regenerates a single section in-place while keeping user edits on all other sections intact."""
    stmt = select(PlanModel).where(
        PlanModel.id == plan_id,
        PlanModel.user_id == current_user.id,
    )
    plan_record = (await db.execute(stmt)).scalar_one_or_none()
    if not plan_record or not plan_record.plan_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found.")
    brief = EventBriefCreate(
        title=plan_record.title,
        event_type=plan_record.event_type,
        event_date=plan_record.event_date,
        location=plan_record.location,
        guest_count=plan_record.guest_count,
        budget_amount=float(plan_record.budget_amount),
        budget_currency=plan_record.budget_currency,
        priorities=plan_record.priorities,
        style=plan_record.style,
        dietary_accessibility_notes=plan_record.dietary_accessibility_notes,
        additional_context=plan_record.additional_context,
    )
    current_plan = GeneratedPlanContent.model_validate(plan_record.plan_data)
    instruction = payload.refinement_instruction if payload else None
    # Call AI adapter for specific section
    new_section_data, metadata = await ai_planner.regenerate_section(
        brief, current_plan, section, instruction
    )
    # In-place update of target section ONLY
    plan_data_dict = plan_record.plan_data.copy()
    if section == "budget":
        plan_data_dict["budget"] = new_section_data.model_dump()
    elif section == "timeline":
        plan_data_dict["timeline"] = [m.model_dump() for m in new_section_data]
    elif section == "vendor_checklist":
        plan_data_dict["vendor_checklist"] = [v.model_dump() for v in new_section_data]
    elif section == "personalized_ideas":
        plan_data_dict["personalized_ideas"] = [i.model_dump() for i in new_section_data]
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid section: {section}")
    plan_record.plan_data = plan_data_dict
    plan_record.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(plan_record)
    
    return PlanResponse(
        id=plan_record.id,
        user_id=plan_record.user_id,
        title=plan_record.title,
        event_type=plan_record.event_type,
        status=PlanStatus(plan_record.status),
        event_brief=brief,
        plan_data=GeneratedPlanContent.model_validate(plan_record.plan_data),
        created_at=plan_record.created_at,
        updated_at=plan_record.updated_at,
    )


def _generate_stub_plan(brief: EventBriefCreate) -> GeneratedPlanContent:
    """Deterministic development stub generating comprehensive plans across all 3 event types."""
    b = brief.budget_amount
    c = brief.budget_currency

    if brief.event_type == EventType.WEDDING:
        summary = (
            f"An enchanting, meticulously designed celebration for {brief.guest_count} guests in {brief.location}. "
            f"Crafted with a focus on {', '.join(brief.priorities) if brief.priorities else 'timeless romance and effortless elegance'}."
        )
        budget = BudgetBreakdown(
            total_budget=b,
            allocated_budget=round(b * 0.90, 2),
            contingency_reserve=round(b * 0.10, 2),
            currency=c,
            categories=["Venue & Catering", "Photography & Video", "Attire & Beauty", "Floral & Decor", "Entertainment"],
            items=[
                BudgetItem(category="Venue & Catering", item_name="Reception Dinner & Bar", estimated_cost=round(b * 0.45, 2), priority="high"),
                BudgetItem(category="Photography & Video", item_name="Full-day Photo + Cinematic Video", estimated_cost=round(b * 0.15, 2), priority="high"),
                BudgetItem(category="Floral & Decor", item_name="Arch, Centerpieces & Ambient Lighting", estimated_cost=round(b * 0.12, 2), priority="medium"),
                BudgetItem(category="Entertainment", item_name="Acoustic Ceremony Trio & Evening DJ", estimated_cost=round(b * 0.10, 2), priority="medium"),
                BudgetItem(category="Attire & Beauty", item_name="Bridal Styling, Hair & Makeup", estimated_cost=round(b * 0.08, 2), priority="medium"),
            ],
        )
        timeline = [
            TimelineMilestone(phase="9-12 Months Out", title="Secure Venue & Date", description="Confirm and deposit primary ceremony & reception space.", due_date_offset_days=300),
            TimelineMilestone(phase="6 Months Out", title="Lock Lead Vendors", description="Contract photographer, caterer, and entertainment artists.", due_date_offset_days=180),
            TimelineMilestone(phase="2 Months Out", title="Invitations & Menu Tasting", description="Dispatch stationery and finalize dietary selections.", due_date_offset_days=60),
            TimelineMilestone(phase="Event Week", title="Final Walkthrough", description="Run full ceremony rehearsal and deliver vendor itinerary.", due_date_offset_days=3),
        ]
        vendors = [
            VendorChecklistItem(category="Venue", role="Venue Coordinator", description="Coordinates facility layout and power logistics.", estimated_budget=round(b * 0.20, 2), booking_deadline_weeks=40, questions_to_ask=["What are curfew and amplified sound guidelines?", "Is bridal suite included?"]),
            VendorChecklistItem(category="Catering", role="Executive Caterer", description="Oversees beverage pairings, appetizers, and plated dinner.", estimated_budget=round(b * 0.25, 2), booking_deadline_weeks=28, questions_to_ask=["How do you handle dietary preferences and allergies?"]),
            VendorChecklistItem(category="Media", role="Lead Photographer", description="Captures documentary and editorial portraiture.", estimated_budget=round(b * 0.15, 2), booking_deadline_weeks=32, questions_to_ask=["How many edited high-res images are guaranteed?", "Turnaround time?"]),
        ]
        ideas = [
            PersonalizedIdea(category="Guest Experience", title="Champagne Tower Welcome Wall", description="Greet arrivals with illuminated flutes and calligraphy seating cards.", estimated_cost_tier="moderate", diy_friendly=False),
            PersonalizedIdea(category="Keepsake", title="Audio Guestbook Vintage Telephone", description="Guests pick up a retro rotary telephone to leave heartfelt voice recordings.", estimated_cost_tier="budget", diy_friendly=True),
        ]

    elif brief.event_type == EventType.BIRTHDAY:
        summary = (
            f"A vibrant milestone celebration for {brief.guest_count} attendees in {brief.location}. "
            f"Styled to celebrate with energy, memorable activities, and tailored culinary touches."
        )
        budget = BudgetBreakdown(
            total_budget=b,
            allocated_budget=round(b * 0.92, 2),
            contingency_reserve=round(b * 0.08, 2),
            currency=c,
            categories=["Venue & Lounge", "Catering & Signature Cocktails", "Entertainment & Sound", "Custom Decor & Cake"],
            items=[
                BudgetItem(category="Venue & Lounge", item_name="Private Event Loft / Rooftop", estimated_cost=round(b * 0.35, 2), priority="high"),
                BudgetItem(category="Catering & Bar", item_name="Gourmet Small Plates & Cocktail Bar", estimated_cost=round(b * 0.35, 2), priority="high"),
                BudgetItem(category="Entertainment", item_name="DJ & Interactive Lighting", estimated_cost=round(b * 0.12, 2), priority="medium"),
                BudgetItem(category="Custom Decor & Cake", item_name="Sculptural Tiered Cake & Floral Photo Wall", estimated_cost=round(b * 0.10, 2), priority="medium"),
            ],
        )
        timeline = [
            TimelineMilestone(phase="8 Weeks Out", title="Venue & Concept Finalization", description="Secure space and outline theme/color palette.", due_date_offset_days=56),
            TimelineMilestone(phase="4 Weeks Out", title="Digital Invitations & RSVP Tracking", description="Send invitations and monitor guest attendance count.", due_date_offset_days=28),
            TimelineMilestone(phase="1 Week Out", title="Final Headcount & Playlist", description="Submit headcount to caterer and share must-play list with DJ.", due_date_offset_days=7),
            TimelineMilestone(phase="Day Of", title="Decor Setup & Welcome", description="Install photo backdrop and welcome guests.", due_date_offset_days=0),
        ]
        vendors = [
            VendorChecklistItem(category="Venue", role="Event Space Host", description="Coordinates entry and bar access.", estimated_budget=round(b * 0.35, 2), booking_deadline_weeks=8, questions_to_ask=["Is cleanup included in rental?"]),
            VendorChecklistItem(category="Bakery", role="Pastry Designer", description="Custom themed celebration cake.", estimated_budget=round(b * 0.05, 2), booking_deadline_weeks=4, questions_to_ask=["Do you provide delivery and stand setup?"]),
        ]
        ideas = [
            PersonalizedIdea(category="Guest Activity", title="Interactive Polaroid Memory Board", description="Guests snap instant photos with personalized stickers and write messages.", estimated_cost_tier="budget", diy_friendly=True),
            PersonalizedIdea(category="Bar", title="Custom Infused Mocktail/Cocktail Station", description="Named drinks highlighting favorite flavors and milestones.", estimated_cost_tier="moderate", diy_friendly=False),
        ]

    else:  # COMMUNITY
        summary = (
            f"An inclusive, community-driven gathering bringing {brief.guest_count} participants together in {brief.location}. "
            f"Engineered for high engagement, accessibility, safety, and community bonding."
        )
        budget = BudgetBreakdown(
            total_budget=b,
            allocated_budget=round(b * 0.90, 2),
            contingency_reserve=round(b * 0.10, 2),
            currency=c,
            categories=["Permits & Facilities", "Food & Refreshments", "Stage & A/V", "Activities & Signage", "Sanitation & First Aid"],
            items=[
                BudgetItem(category="Facilities & Permits", item_name="Park/Square Permit & Canopy Rentals", estimated_cost=round(b * 0.25, 2), priority="high"),
                BudgetItem(category="Food & Refreshments", item_name="Community Food Trucks / Buffet Stalls", estimated_cost=round(b * 0.35, 2), priority="high"),
                BudgetItem(category="Stage & A/V", item_name="PA Sound System, Microphones & Generators", estimated_cost=round(b * 0.15, 2), priority="high"),
                BudgetItem(category="Signage & Activities", item_name="Wayfinding Banners, Name Badges & Lawn Games", estimated_cost=round(b * 0.10, 2), priority="medium"),
                BudgetItem(category="Safety", item_name="Sanitation Stations & Volunteer Radios", estimated_cost=round(b * 0.05, 2), priority="high"),
            ],
        )
        timeline = [
            TimelineMilestone(phase="12 Weeks Out", title="Municipal Permits & Insurance", description="Submit public gathering permits and acquire event liability insurance.", due_date_offset_days=84),
            TimelineMilestone(phase="6 Weeks Out", title="Community Partner Outreach", description="Coordinate local vendors, volunteers, and speaker lineups.", due_date_offset_days=42),
            TimelineMilestone(phase="2 Weeks Out", title="Logistics & Volunteer Briefing", description="Distribute shift schedules and site safety maps.", due_date_offset_days=14),
            TimelineMilestone(phase="Event Day", title="Setup & Open Gates", description="Install stage, signage, and begin registrations.", due_date_offset_days=0),
        ]
        vendors = [
            VendorChecklistItem(category="Audio/Visual", role="Sound Engineer", description="Manages live announcements, microphones, and acoustics.", estimated_budget=round(b * 0.15, 2), booking_deadline_weeks=6, questions_to_ask=["Do you have independent backup power/generators?"]),
            VendorChecklistItem(category="Logistics", role="Equipment Rental Company", description="Supplies tables, shade canopies, and trash receptacles.", estimated_budget=round(b * 0.15, 2), booking_deadline_weeks=8, questions_to_ask=["What are delivery and drop-off arrival windows?"]),
        ]
        ideas = [
            PersonalizedIdea(category="Engagement", title="Community Mural Canvas", description="A collective paint-by-numbers canvas where attendees leave their mark.", estimated_cost_tier="budget", diy_friendly=True),
            PersonalizedIdea(category="Accessibility", title="Dedicated Sensory Quiet Lounge", description="Shaded seating area with noise-dampening ear covers and water.", estimated_cost_tier="budget", diy_friendly=True),
        ]

    return GeneratedPlanContent(
        summary=summary,
        budget=budget,
        timeline=timeline,
        vendor_checklist=vendors,
        personalized_ideas=ideas,
        assumptions=[
            f"Estimates formulated for {brief.guest_count} guests in {brief.location}.",
            f"Contingency reserve maintained at approximately 8-10% of total {c} budget.",
            "Vendor pricing reflects current average commercial rates.",
        ],
        next_actions=[
            "Review budget allocations and customize specific line items.",
            "Contact top-priority vendors based on the recommended timeline deadlines.",
            "Bookmark and share personalized ideas with planning co-hosts.",
        ],
    )