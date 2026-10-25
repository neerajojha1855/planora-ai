"""Authentication router handling registration, login, logout, and session profile."""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Cookie, Depends, Request, Response
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from ..config import get_settings
from ..core.rate_limit import auth_rate_limiter
from ..core.deps import get_current_user
from ..core.security import generate_session_token, hash_password, hash_session_token, verify_password
from ..db import get_session
from ..models import Session as SessionModel, User
from ..schemas.auth import (
    AuthMessageResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()

def _set_session_cookie(response: Response, raw_token: str, max_age: int) -> None:
    """Configures secure HTTP-only session cookie on the outgoing HTTP response."""
    response.set_cookie(
        key=settings.session_cookie_name,
        value=raw_token,
        max_age=max_age,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        path="/"
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegisterRequest, response: Response, request: Request, db: AsyncSession=Depends(get_session), _rate_limit=Depends(auth_rate_limiter)) -> UserResponse:
    """Registration contract boundary with email and password complexity validation."""
    stmt = select(User).where(User.email == payload.email)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to register with the provided credentials.")
    
    user = User(
        id=uuid.uuid4(),
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        is_active=True
    )
    db.add(user)
    await db.flush()

    raw_token, token_hash, expires_at = generate_session_token(settings.session_lifetime_seconds)
    session_record = SessionModel(
        id=uuid.uuid4(),
        user_id=user.id,
        token_hash=token_hash,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent", "")[:500],
        expires_at=expires_at
    )
    db.add(session_record)
    await db.commit()
    await db.refresh(user)

    _set_session_cookie(response, raw_token, settings.session_lifetime_seconds)

    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        created_at=user.created_at
    )


@router.post("/login", response_model=AuthMessageResponse)
async def login(payload: UserLoginRequest, response: Response, request: Request, db: AsyncSession=Depends(get_session), _rate_limit=Depends(auth_rate_limiter)) -> AuthMessageResponse:
    """Login contract boundary with generic safe error responses (anti-enumeration)."""
    stmt = select(User).where(User.email==payload.email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash) or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    
    raw_token, token_hash, expires_at = generate_session_token(settings.session_lifetime_seconds)
    new_session = SessionModel(
        id=uuid.uuid4(),
        user_id=user.id,
        token_hash=token_hash,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent", "")[:500],
        expires_at=expires_at
    )
    db.add(new_session)
    await db.commit()

    _set_session_cookie(response, raw_token, settings.session_lifetime_seconds)

    return AuthMessageResponse(
        success=True,
        message="Authentication successful."
    )


@router.post("/logout", response_model=AuthMessageResponse)
async def logout(response: Response, planora_session: str | None=Cookie(default=None, alias=settings.session_cookie_name), db: AsyncSession=Depends(get_session)) -> AuthMessageResponse:
    """Logout contract boundary."""
    if planora_session:
        token_hash = hash_session_token(planora_session)
        stmt = delete(SessionModel).where(SessionModel.token_hash==token_hash)
        await db.execute(stmt)
        await db.commit()
    
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite
    )

    return AuthMessageResponse(
        success=True,
        message="Successfully signed out.",
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User=Depends(get_current_user)) -> UserResponse:
    """Current authenticated user contract boundary."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        created_at=current_user.created_at
    )

