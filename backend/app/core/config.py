from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgrespassword@localhost:5432/smoke_emission_db"
    REDIS_URL: str = "redis://localhost:6379/0"
    JWT_SECRET: str = "supersecretjwtkeyforbackendenvironment9876543210"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 1 day
    UPLOAD_DIR: str = "evidence"

    class Config:
        env_file = ".env"

settings = Settings()
