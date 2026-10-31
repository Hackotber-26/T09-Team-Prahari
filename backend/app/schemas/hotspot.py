from typing import List, Literal

from pydantic import BaseModel, ConfigDict, Field


class HotspotResponse(BaseModel):
    cluster_id: int
    is_noise: bool
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    report_count: int = Field(ge=1)
    report_ids: List[int]
    average_severity: float = Field(ge=1.0, le=5.0)
    evidence_ratio: float = Field(ge=0.0, le=1.0)
    risk_score: float = Field(ge=0.0, le=100.0)
    risk_classification: Literal["Low", "Medium", "High"]

    model_config = ConfigDict(extra="forbid")


class HotspotsResponse(BaseModel):
    hotspots: List[HotspotResponse]
    count: int = Field(ge=0)

    model_config = ConfigDict(extra="forbid")
