from typing import List, Optional
import logging

from fastapi import APIRouter, Depends, File, Header, HTTPException, Path as PathParam, Query, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.schemas.report import AttachmentResponse, ReportCreate, ReportResponse
from app.services.report import ReportService
from app.services.semantic_similarity import (
    EmptyDescriptionError,
    SemanticAnalysisError,
    semantic_similarity_service,
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(
    report: ReportCreate,
    db: Session = Depends(get_db),
    idempotency_key: Optional[str] = Header(
        default=None,
        alias="Idempotency-Key",
        min_length=1,
        max_length=128,
    ),
):
    """Submit a near-miss report."""
    return ReportService.create_report(db=db, report=report, submission_key=idempotency_key)


@router.get("", response_model=List[ReportResponse])
def get_reports(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """Retrieve near-miss reports, newest first."""
    return ReportService.get_reports(db=db, skip=skip, limit=limit)


@router.get("/{report_id}/similar")
def find_similar_reports(
    report_id: int = PathParam(ge=1),
    threshold: float = Query(default=settings.SEMANTIC_SIMILARITY_THRESHOLD, ge=0.0, le=1.0),
    db: Session = Depends(get_db),
):
    """Find descriptions with semantic similarity; this does not establish a shared incident."""
    report = ReportService.get_report(db=db, report_id=report_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    reports = ReportService.get_all_reports(db)
    try:
        matches = semantic_similarity_service.find_similar_reports(
            report,
            reports,
            threshold=threshold,
        )
    except EmptyDescriptionError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error)) from error
    except SemanticAnalysisError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Semantic analysis is temporarily unavailable: {error}",
        ) from error
    return {
        "report_id": report.id,
        "threshold": threshold,
        "matches": [
            {
                "report_id": match.report_id,
                "similarity_score": match.similarity_score,
                "description": match.description,
            }
            for match in matches
        ],
        "notice": "Semantic similarity is experimental and does not prove that reports describe the same incident.",
    }


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(report_id: int = PathParam(ge=1), db: Session = Depends(get_db)):
    """Retrieve one near-miss report by ID."""
    db_report = ReportService.get_report(db=db, report_id=report_id)
    if db_report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return db_report


@router.get("/{report_id}/evidence", response_model=List[AttachmentResponse])
def get_report_evidence(report_id: int = PathParam(ge=1), db: Session = Depends(get_db)):
    """Retrieve evidence metadata associated with a report."""
    if ReportService.get_report(db=db, report_id=report_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return ReportService.get_attachments(db=db, report_id=report_id)


@router.post(
    "/{report_id}/evidence",
    response_model=List[AttachmentResponse],
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/{report_id}/attachments",
    response_model=List[AttachmentResponse],
    status_code=status.HTTP_201_CREATED,
)
def upload_attachments(
    files: List[UploadFile] = File(...),
    report_id: int = PathParam(ge=1),
    db: Session = Depends(get_db),
):
    report = ReportService.get_report(db=db, report_id=report_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    try:
        return ReportService.save_attachments(db=db, report=report, files=files)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error)) from error
    except OSError as error:
        logger.exception("Could not save evidence for report %s", report_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Evidence files could not be stored",
        ) from error
    finally:
        for upload in files:
            upload.file.close()


@router.get("/{report_id}/attachments/{attachment_id}")
def download_attachment(
    report_id: int = PathParam(ge=1),
    attachment_id: int = PathParam(ge=1),
    db: Session = Depends(get_db),
):
    attachment = ReportService.get_attachment(db, report_id, attachment_id)
    if attachment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found")
    upload_root = settings.upload_path.resolve()
    stored_path = (upload_root / attachment.storage_name).resolve()
    if stored_path.parent != upload_root:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file is unavailable")
    if not stored_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file is unavailable")
    return FileResponse(
        stored_path,
        media_type=attachment.content_type or "application/octet-stream",
        filename=attachment.filename,
        content_disposition_type="inline",
        headers={"X-Content-Type-Options": "nosniff"},
    )


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(report_id: int = PathParam(ge=1), db: Session = Depends(get_db)) -> Response:
    """Delete a near-miss report by ID."""
    db_report = ReportService.get_report(db=db, report_id=report_id)
    if db_report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    ReportService.delete_report(db=db, report=db_report)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
