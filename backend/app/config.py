from functools import lru_cache
from typing import Literal
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # environment
    environment: Literal["development", "production"] = "development"
    debug: bool = False
    app_name: str = "Planora API"
    api_prefix: str = "/api/v1"

    # database
    database_url: str
    database_url_unpooled: str | None = None
    neon_branch: str | None = None

    # cors
    frontend_origin: str = "https://localhost:5173"

    # auth
    session_secret_key: str = "change-me-in-production"
    session_lifetime_seconds: int = 86400
    session_cookie_name: str = "planora_session"
    session_cookie_secure: bool = False
    session_cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    # ai provider
    gemini_api_key: str = ""
    gemini_model_name: str = "gemini-2.5-flash"
    ai_request_timeout_seconds: int = 60
    ai_max_retries: int = 2

    @field_validator("session_cookie_secure", mode="before")
    @classmethod
    def auto_secure_cookie(cls, v, info):
        if info.data.get("environment") == "production":
            return True
        
        return v
    
    model_config = SettingsConfigDict(
        env_file=(".env.local", ".env", "backend/.env.local", "backend/.env", "../.env.local", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

@lru_cache
def get_settings() -> Settings:
    return Settings()