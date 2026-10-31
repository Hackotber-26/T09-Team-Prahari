from datetime import datetime
from typing import List, Literal, Optional

from pydantic import AliasChoices, AnyHttpUrl, BaseModel, ConfigDict, Field, computed_field, field_validator


class ReportBase(BaseModel):
    title: Optional[str] = Field(
        default=None,
        max_length=255,
        validation_alias=AliasChoices("title", "location_name"),
    )
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
    location_source: Optional[Literal["gps", "search", "map"]] = None
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


class AttachmentResponse(BaseModel):
    id: int
    filename: str
    content_type: Optional[str] = None
    size_bytes: int
    created_at: datetime
    download_url: str

    model_config = ConfigDict(from_attributes=True, extra="forbid")


class ReportResponse(ReportBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    attachments: List[AttachmentResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    @computed_field
    @property
    def location_name(self) -> Optional[str]:
        return self.title
