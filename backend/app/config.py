from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    database_url_unpooled: str | None = None
    neon_branch: str | None = None
    frontend_origin: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=(".env.local", ".env", "../.env.local", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()