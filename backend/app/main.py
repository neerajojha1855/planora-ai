import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from .config import get_settings
from .db import check_database_connection, dispose_engine
from .routers import auth_router, plans_router

@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await dispose_engine()

logger = logging.getLogger("planora.security")
MAX_REQUEST_BODY_BYTES = 2 * 1024 * 1024  # 2MB

settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)

@app.middleware("http")
async def security_hardening_middleware(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_REQUEST_BODY_BYTES:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={"detail": "Payload too large. Maximum allowed size is 2MB."}
        )
    
    response: Response = await call_next(request)

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["X-XSS-Protection"] = "1; mode=block"

    return response

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occured. Request ID logged for review"}
    )

app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(plans_router, prefix=settings.api_prefix)


@app.get(f"{settings.api_prefix}/health")
async def health() -> dict[str, str]:
    try:
        await check_database_connection()
    except SQLAlchemyError:
        return {"status": "degraded", "database": "unavailable"}
    return {"status": "ok", "database": "connected"}