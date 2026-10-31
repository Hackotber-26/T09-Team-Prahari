from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.hotspot import HotspotsResponse
from app.services.report import ReportService
from app.services.hotspot import HotspotService

router = APIRouter()


@router.get("", response_model=HotspotsResponse)
def get_hotspots(db: Session = Depends(get_db)):
    reports = ReportService.get_all_reports(db=db)
    try:
        hotspots = HotspotService.get_hotspots(reports)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    return {"hotspots": hotspots, "count": len(hotspots)}
