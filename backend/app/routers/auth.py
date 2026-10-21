import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from ..schemas.auth import (
    AuthMessageResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegisterRequest) -> UserResponse:
    """Registration contract boundary with email and password complexity validation."""
    return UserResponse(
        id=uuid.uuid4(),
        email=payload.email,
        full_name=payload.full_name,
        created_at=datetime.now(timezone.utc),
    )


@router.post("/login", response_model=AuthMessageResponse)
async def login(payload: UserLoginRequest) -> AuthMessageResponse:
    """Login contract boundary with generic safe error responses (anti-enumeration)."""
    return AuthMessageResponse(
        success=True,
        message="Authentication successful.",
    )


@router.post("/logout", response_model=AuthMessageResponse)
async def logout() -> AuthMessageResponse:
    """Logout contract boundary."""
    return AuthMessageResponse(
        success=True,
        message="Successfully signed out.",
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user() -> UserResponse:
    """Current authenticated user contract boundary."""
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated.",
    )
