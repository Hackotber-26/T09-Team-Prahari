from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_db
from app.services.report import ReportService
from app.services.hotspot import HotspotService

router = APIRouter()


@router.get("/")
def get_hotspots(db: Session = Depends(get_db)):
    reports = ReportService.get_reports(db=db)
    hotspots = HotspotService.get_hotspots(reports)
    return {"hotspots": hotspots, "count": len(hotspots)}
