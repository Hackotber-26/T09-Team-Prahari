from typing import List

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.report import ReportCreate, ReportResponse
from app.services.report import ReportService

router = APIRouter()


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(report: ReportCreate, db: Session = Depends(get_db)):
    """Submit a near-miss report."""
    return ReportService.create_report(db=db, report=report)


@router.get("", response_model=List[ReportResponse])
def get_reports(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """Retrieve near-miss reports, newest first."""
    return ReportService.get_reports(db=db, skip=skip, limit=limit)


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(report_id: int = Path(ge=1), db: Session = Depends(get_db)):
    """Retrieve one near-miss report by ID."""
    db_report = ReportService.get_report(db=db, report_id=report_id)
    if db_report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return db_report


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(report_id: int = Path(ge=1), db: Session = Depends(get_db)) -> Response:
    """Delete a near-miss report by ID."""
    db_report = ReportService.get_report(db=db, report_id=report_id)
    if db_report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    ReportService.delete_report(db=db, report=db_report)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
