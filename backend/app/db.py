from collections.abc import AsyncIterator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from .config import get_settings

class Base(DeclarativeBase):
    pass

def _async_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql+psycopg://"):
        return database_url
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    raise ValueError("DATABASE_URL must use the postgresql:// scheme")


settings = get_settings()
engine = create_async_engine(
    _async_database_url(settings.database_url),
    pool_pre_ping=True,
    echo=settings.debug,
)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False)

async def get_session() -> AsyncIterator[AsyncSession]:
    async with async_session_factory() as session:
        yield session

async def check_database_connection() -> None:
    async with engine.begin() as connection:
        await connection.execute(text("SELECT 1"))

async def dispose_engine() -> None:
    await engine.dispose()