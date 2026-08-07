import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Financial Operations Agent"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = Field(default="super_secret_finops_jwt_key_2026", validation_alias="SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    # Database
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/finops",
        validation_alias="DATABASE_URL"
    )

    # Redis (for Celery)
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        validation_alias="REDIS_URL"
    )

    # ChromaDB
    CHROMA_PERSIST_DIR: str = "chroma_db"
    
    # AI API keys
    OPENAI_API_KEY: str = Field(default="", validation_alias="OPENAI_API_KEY")
    OPENAI_MODEL: str = "gpt-4o-mini"

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
