from datetime import date, datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pytest

from app.db.base import Base
from app.models.report import Report
from app.services.hotspot import cluster_reports
from seed_demo import ensure_existing_database, seed_reports


def test_seed_refuses_to_create_a_missing_sqlite_database(tmp_path):
    database_path = tmp_path / "must-not-be-created.sqlite"
    engine = create_engine(f"sqlite:///{database_path}")

    try:
        with pytest.raises(FileNotFoundError, match="does not exist"):
            ensure_existing_database(engine)
        assert not database_path.exists()
    finally:
        engine.dispose()


def test_seed_demo_is_labelled_clustered_and_idempotent(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'seed.sqlite'}")
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)
    seed_date = date(2026, 10, 31)

    with session_factory() as db:
        user_report = Report(
            title="User submitted report",
            latitude=40.7128,
            longitude=-74.006,
            description="A genuine user-created test report.",
            category="Other",
            severity=3,
            incident_datetime=datetime.now(timezone.utc),
            evidence_available=False,
        )
        db.add(user_report)
        db.commit()
        user_report_id = user_report.id

        first = seed_reports(db, today=seed_date)
        reports = (
            db.query(Report)
            .filter(Report.title.like("[SYNTHETIC DEMO]%"))
            .all()
        )
        clusters = cluster_reports(reports)

        assert first.inserted == 20
        assert first.already_present == 0
        assert first.synthetic_total == 20
        assert first.cluster_count == 3
        assert sorted(len(cluster.reports) for cluster in clusters if not cluster.is_noise) == [4, 4, 4]
        assert sum(cluster.is_noise for cluster in clusters) == 8
        assert {report.severity for report in reports} == {1, 2, 3, 4, 5}
        assert all(report.title.startswith("[SYNTHETIC DEMO]") for report in reports)
        assert all(not report.evidence_available and not report.attachments for report in reports)
        incident_dates = {report.incident_datetime.date() for report in reports}
        assert seed_date in incident_dates
        assert min(incident_dates) < seed_date
        assert db.query(Report).filter(Report.id == user_report_id).one().title == "User submitted report"

        second = seed_reports(db, today=seed_date)

        assert second.inserted == 0
        assert second.already_present == 20
        assert db.query(Report).count() == 21
        assert [summary[2:] for summary in first.hotspot_summary] == [
            (42.0, "Medium"),
            (42.0, "Medium"),
            (34.0, "Low"),
        ]

    engine.dispose()
