from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship, synonym
from sqlalchemy.sql import func
from app.db.base import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    submission_key = Column(String(128), nullable=True, unique=True, index=True)
    title = Column(String, nullable=True)
    location_name = synonym("title")
    description = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_lat = synonym("latitude")
    location_lng = synonym("longitude")
    location_source = Column(String(16), nullable=True)
    category = Column(String, nullable=True, index=True)
    severity = Column(Integer, nullable=False)
    incident_datetime = Column(DateTime(timezone=True), nullable=False)
    evidence_available = Column(Boolean, nullable=False, default=False)
    image_url = Column(String, nullable=True)
    reporter_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    attachments = relationship(
        "EvidenceAttachment",
        back_populates="report",
        cascade="all, delete-orphan",
        order_by="EvidenceAttachment.id",
    )


class EvidenceAttachment(Base):
    __tablename__ = "report_attachments"
    __table_args__ = (
        UniqueConstraint("report_id", "sha256", name="uq_attachment_report_sha256"),
    )

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(255), nullable=True)
    storage_name = Column(String(64), nullable=False, unique=True)
    size_bytes = Column(Integer, nullable=False)
    sha256 = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    report = relationship("Report", back_populates="attachments")

    @property
    def download_url(self) -> str:
        return f"/api/v1/reports/{self.report_id}/attachments/{self.id}"
