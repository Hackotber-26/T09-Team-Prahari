import hashlib
import logging
import uuid
from pathlib import Path
from typing import List, Optional, Sequence

from fastapi import UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.report import EvidenceAttachment, Report
from app.schemas.report import ReportCreate

logger = logging.getLogger(__name__)


class ReportService:
    ALLOWED_CONTENT_TYPES = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".pdf": "application/pdf",
    }

    @staticmethod
    def create_report(
        db: Session,
        report: ReportCreate,
        submission_key: Optional[str] = None,
    ) -> Report:
        if submission_key:
            existing = db.query(Report).filter(Report.submission_key == submission_key).first()
            if existing is not None:
                return existing

        report_data = report.model_dump()
        if report_data["image_url"] is not None:
            report_data["image_url"] = str(report_data["image_url"])
        db_report = Report(**report_data, submission_key=submission_key)
        db.add(db_report)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            if submission_key:
                existing = db.query(Report).filter(Report.submission_key == submission_key).first()
                if existing is not None:
                    return existing
            raise
        db.refresh(db_report)
        return db_report

    @staticmethod
    def get_reports(db: Session, skip: int = 0, limit: int = 100) -> List[Report]:
        return db.query(Report).order_by(Report.id.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_all_reports(db: Session) -> List[Report]:
        return db.query(Report).order_by(Report.id.desc()).all()

    @staticmethod
    def get_report(db: Session, report_id: int) -> Optional[Report]:
        return db.query(Report).filter(Report.id == report_id).first()

    @staticmethod
    def delete_report(db: Session, report: Report) -> None:
        stored_files = [attachment.storage_name for attachment in report.attachments]
        db.delete(report)
        db.commit()
        for storage_name in stored_files:
            try:
                settings.upload_path.joinpath(storage_name).unlink(missing_ok=True)
            except OSError:
                logger.exception("Could not remove evidence file %s", storage_name)

    @staticmethod
    def save_attachments(
        db: Session,
        report: Report,
        files: Sequence[UploadFile],
    ) -> List[EvidenceAttachment]:
        if not files:
            raise ValueError("At least one evidence file is required")
        upload_path = settings.upload_path
        upload_path.mkdir(parents=True, exist_ok=True)
        written_paths: List[Path] = []
        added_attachments: List[EvidenceAttachment] = []
        staged_digests = set()
        new_attachment_count = 0
        try:
            for upload in files:
                original_name = Path(upload.filename or "").name.strip()
                if not original_name:
                    raise ValueError("Evidence files must have a filename")

                contents = upload.file.read(settings.MAX_UPLOAD_SIZE_BYTES + 1)
                if not contents:
                    raise ValueError(f"{original_name} is empty")
                if len(contents) > settings.MAX_UPLOAD_SIZE_BYTES:
                    raise ValueError(
                        f"{original_name} exceeds the {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB per-file limit"
                    )

                extension = Path(original_name).suffix.lower()
                content_type = ReportService._detect_content_type(
                    extension,
                    upload.content_type,
                    contents,
                )
                digest = hashlib.sha256(contents).hexdigest()
                if digest in staged_digests:
                    continue
                staged_digests.add(digest)
                existing = (
                    db.query(EvidenceAttachment)
                    .filter(
                        EvidenceAttachment.report_id == report.id,
                        EvidenceAttachment.sha256 == digest,
                    )
                    .first()
                )
                if existing is not None:
                    added_attachments.append(existing)
                    continue
                if len(report.attachments) + new_attachment_count >= settings.MAX_ATTACHMENTS_PER_REPORT:
                    raise ValueError(
                        f"A report can have at most {settings.MAX_ATTACHMENTS_PER_REPORT} evidence files"
                    )

                storage_name = uuid.uuid4().hex
                stored_path = upload_path / storage_name
                stored_path.write_bytes(contents)
                written_paths.append(stored_path)
                attachment = EvidenceAttachment(
                    report_id=report.id,
                    filename=original_name[:255],
                    content_type=content_type,
                    storage_name=storage_name,
                    size_bytes=len(contents),
                    sha256=digest,
                )
                db.add(attachment)
                added_attachments.append(attachment)
                new_attachment_count += 1

            if added_attachments:
                report.evidence_available = True
            db.commit()
        except Exception:
            db.rollback()
            for path in written_paths:
                try:
                    path.unlink(missing_ok=True)
                except OSError:
                    logger.exception("Could not remove incomplete evidence file %s", path)
            raise
        for attachment in added_attachments:
            db.refresh(attachment)
        return added_attachments

    @staticmethod
    def _detect_content_type(extension: str, declared_type: Optional[str], contents: bytes) -> str:
        expected_type = ReportService.ALLOWED_CONTENT_TYPES.get(extension)
        if expected_type is None:
            raise ValueError("Unsupported evidence file type. Use JPG, JPEG, PNG, WEBP, or PDF.")

        if expected_type == "image/jpeg":
            signature_matches = contents.startswith(b"\xff\xd8\xff")
        elif expected_type == "image/png":
            signature_matches = contents.startswith(b"\x89PNG\r\n\x1a\n")
        elif expected_type == "image/webp":
            signature_matches = (
                len(contents) >= 12
                and contents.startswith(b"RIFF")
                and contents[8:12] == b"WEBP"
            )
        else:
            signature_matches = contents.startswith(b"%PDF-")

        if not signature_matches:
            raise ValueError("Evidence file content does not match its supported file type")

        normalized_type = (declared_type or "").split(";", 1)[0].strip().lower()
        if normalized_type and normalized_type not in {
            expected_type,
            "application/octet-stream",
        }:
            raise ValueError("Evidence file content type does not match its file extension")
        return expected_type

    @staticmethod
    def get_attachment(db: Session, report_id: int, attachment_id: int) -> Optional[EvidenceAttachment]:
        return (
            db.query(EvidenceAttachment)
            .filter(
                EvidenceAttachment.id == attachment_id,
                EvidenceAttachment.report_id == report_id,
            )
            .first()
        )

    @staticmethod
    def get_attachments(db: Session, report_id: int) -> List[EvidenceAttachment]:
        return (
            db.query(EvidenceAttachment)
            .filter(EvidenceAttachment.report_id == report_id)
            .order_by(EvidenceAttachment.id)
            .all()
        )
