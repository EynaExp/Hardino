from pydantic_settings import BaseSettings
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Hardino"
    VERSION: str = "0.1.0"
    DATABASE_URL: str = f"sqlite+aiosqlite:///./data/hardino.db"

    JWT_SECRET: str = "hardino-dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    MCP_URL: str = "http://localhost:3001/mcp"
    EXECUTOR_TYPE: str = "local"

    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENAI_MODEL: str = "xiaomi/mimo-v2.5"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
