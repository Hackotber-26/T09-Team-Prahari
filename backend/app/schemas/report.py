from datetime import datetime
from typing import Optional

from pydantic import AliasChoices, AnyHttpUrl, BaseModel, ConfigDict, Field, field_validator


class ReportBase(BaseModel):
    title: Optional[str] = None
    description: str = Field(min_length=1, max_length=5000)
    latitude: float = Field(
        ge=-90,
        le=90,
        validation_alias=AliasChoices("latitude", "location_lat"),
    )
    longitude: float = Field(
        ge=-180,
        le=180,
        validation_alias=AliasChoices("longitude", "location_lng"),
    )
    category: Optional[str] = None
    severity: int = Field(strict=True, ge=1, le=5)
    incident_datetime: datetime
    evidence_available: bool = Field(strict=True)
    image_url: Optional[AnyHttpUrl] = None
    reporter_name: Optional[str] = None

    model_config = ConfigDict(extra="forbid")

    @field_validator("description")
    @classmethod
    def description_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Description must not be blank")
        return value


class ReportCreate(ReportBase):
    pass


class ReportResponse(ReportBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, extra="forbid")
