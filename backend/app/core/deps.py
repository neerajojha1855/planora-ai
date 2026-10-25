"""FastAPI dependency injection utilities for user authentication and session resolution."""

from datetime import datetime, timezone
from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from ..config import get_settings
from ..db import get_session
from ..models import Session as SessionModel, User
from .security import hash_session_token

settings = get_settings()

async def get_optional_current_user(
    planora_session: str | None = Cookie(default=None, alias=settings.session_cookie_name),
    db: AsyncSession = Depends(get_session)
) -> User | None:
    """Resolves authenticated user from session cookie if present, valid, and unexpired."""
    if not planora_session:
        return None
    
    token_hash = hash_session_token(planora_session)
    now = datetime.now(timezone.utc)

    stmt = (
        select(SessionModel)
        .options(selectinload(SessionModel.user))
        .where(
            SessionModel.token_hash == token_hash,
            SessionModel.expires_at > now,
        )
    )
    result = await db.execute(stmt)
    session_record = result.scalar_one_or_none()

    if not session_record or not session_record.user or not session_record.user.is_active:
        return None
    
    return session_record.user

async def get_current_user(user: User | None = Depends(get_optional_current_user)) -> User:
    """Enforces active user authentication on protected endpoint dependencies.
    
    Raises:
        HTTPException: 401 Unauthorized if no valid user session is detected.
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in."
        )
    
    return user