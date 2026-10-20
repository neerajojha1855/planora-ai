import asyncio
from collections.abc import Iterator

from sqlalchemy import text
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from .config import get_settings


def _database_url(database_url: str) -> str:
    if database_url.startswith("postgresql+psycopg://"):
        return database_url
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    raise ValueError("DATABASE_URL must use the postgresql:// scheme")


settings = get_settings()
engine = create_engine(
    _database_url(settings.database_url),
    pool_pre_ping=True,
)
session_factory = sessionmaker(engine, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    with session_factory() as session:
        yield session


def check_database_connection() -> None:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))


async def check_database_connection_async() -> None:
    await asyncio.to_thread(check_database_connection)


def dispose_engine() -> None:
    engine.dispose()