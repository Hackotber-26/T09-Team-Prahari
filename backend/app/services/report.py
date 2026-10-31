from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.report import Report
from app.schemas.report import ReportCreate


class ReportService:
    @staticmethod
    def create_report(db: Session, report: ReportCreate) -> Report:
        report_data = report.model_dump()
        if report_data["image_url"] is not None:
            report_data["image_url"] = str(report_data["image_url"])
        db_report = Report(**report_data)
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        return db_report

    @staticmethod
    def get_reports(db: Session, skip: int = 0, limit: int = 100) -> List[Report]:
        return db.query(Report).order_by(Report.id.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_report(db: Session, report_id: int) -> Optional[Report]:
        return db.query(Report).filter(Report.id == report_id).first()

    @staticmethod
    def delete_report(db: Session, report: Report) -> None:
        db.delete(report)
        db.commit()
