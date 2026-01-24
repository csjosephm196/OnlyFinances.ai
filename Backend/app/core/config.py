"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Keys (comma-separated for rotation support)
    GEMINI_API_KEYS: str = ""  # e.g., "key1,key2,key3,key4,key5"
    
    # Application settings
    DEBUG: bool = False
    APP_NAME: str = "Budget AI API"
    APP_VERSION: str = "0.1.0"
    
    # CORS settings
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    
    # Advisor AI settings
    ADVISOR_TEMPERATURE: float = 0.4  # Slightly creative for personality
    ADVISOR_MAX_HISTORY: int = 10  # Max conversation messages to keep
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
