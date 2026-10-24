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
    PlanUpdateRequest,
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

@router.patch("/{plan_id}", response_model=PlanResponse)
async def update_plan(
    plan_id: uuid.UUID,
    payload: PlanUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
) -> PlanResponse:
    """Updates a plan's title or generated plan content in-place with user ownership enforcement"""
    stmt = select(PlanModel).where(
        PlanModel.id == plan_id,
        PlanModel.user_id == current_user.id
    )
    plan_record = (await db.execute(stmt)).scalar_one_or_none()
    if not plan_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    
    if payload.title is not None:
        plan_record.title = payload.title
    if payload.plan_data is not None:
        plan_record.plan_data = payload.plan_data.model_dump()
    
    plan_record.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(plan_record)

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
        additional_context=plan_record.additional_context
    )

    return PlanResponse(
        id=plan_record.id,
        user_id=plan_record.user_id,
        title=plan_record.title,
        event_type=plan_record.event_type,
        status=PlanStatus(plan_record.status),
        event_brief=brief,
        plan_data=GeneratedPlanContent.model_validate(plan_record.plan_data) if plan_record.plan_data else None,
        created_at=plan_record.created_at,
        updated_at=plan_record.updated_at
    )