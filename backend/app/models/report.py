from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import synonym
from sqlalchemy.sql import func
from app.db.base import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_lat = synonym("latitude")
    location_lng = synonym("longitude")
    category = Column(String, nullable=True, index=True)
    severity = Column(Integer, nullable=False)
    incident_datetime = Column(DateTime(timezone=True), nullable=False)
    evidence_available = Column(Boolean, nullable=False, default=False)
    image_url = Column(String, nullable=True)
    reporter_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
