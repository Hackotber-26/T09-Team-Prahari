from pathlib import Path
from typing import List

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "NearMiss Atlas"
    API_V1_STR: str = "/api/v1"
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
    ]
    DATABASE_URL: str = "sqlite:///./nearmiss.db"
    UPLOAD_DIRECTORY: str = "uploads"
    MAX_UPLOAD_SIZE_BYTES: int = Field(default=25 * 1024 * 1024, ge=1)
    MAX_ATTACHMENTS_PER_REPORT: int = Field(default=10, ge=1, le=50)
    SEMANTIC_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    SEMANTIC_SIMILARITY_THRESHOLD: float = Field(default=0.55, ge=0.0, le=1.0)
    HOTSPOT_RADIUS_METERS: float = Field(default=500.0, gt=0.0)
    HOTSPOT_MIN_SAMPLES: int = Field(default=3, ge=1)
    EARTH_RADIUS_KM: float = Field(default=6371.0, gt=0.0)
    RISK_SEVERITY_WEIGHT: float = Field(default=0.40, ge=0.0, le=1.0)
    RISK_FREQUENCY_WEIGHT: float = Field(default=0.35, ge=0.0, le=1.0)
    RISK_EVIDENCE_WEIGHT: float = Field(default=0.25, ge=0.0, le=1.0)
    RISK_FREQUENCY_REPORTS: int = Field(default=10, ge=1)
    RISK_MEDIUM_THRESHOLD: float = Field(default=40.0, ge=0.0, le=100.0)
    RISK_HIGH_THRESHOLD: float = Field(default=70.0, ge=0.0, le=100.0)

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    @model_validator(mode="after")
    def validate_risk_configuration(self):
        weights = (
            self.RISK_SEVERITY_WEIGHT
            + self.RISK_FREQUENCY_WEIGHT
            + self.RISK_EVIDENCE_WEIGHT
        )
        if abs(weights - 1.0) > 1e-9:
            raise ValueError("Risk score weights must sum to 1")
        if self.RISK_HIGH_THRESHOLD <= self.RISK_MEDIUM_THRESHOLD:
            raise ValueError("High risk threshold must exceed medium risk threshold")
        return self

    @property
    def upload_path(self) -> Path:
        path = Path(self.UPLOAD_DIRECTORY)
        if path.is_absolute():
            return path
        return Path(__file__).resolve().parents[2] / path


settings = Settings()
