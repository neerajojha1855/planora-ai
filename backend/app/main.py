from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from .config import get_settings
from .db import check_database_connection_async, dispose_engine


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    dispose_engine()


settings = get_settings()
app = FastAPI(
    title="Planora API",
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


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    try:
        await check_database_connection_async()
    except SQLAlchemyError:
        return {"status": "degraded", "database": "unavailable"}
    return {"status": "ok", "database": "connected"}