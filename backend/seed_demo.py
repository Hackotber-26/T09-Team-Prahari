"""Seed the configured NearMiss Atlas database with synthetic Bengaluru reports."""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Optional

from sqlalchemy import inspect
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.db.base import SessionLocal, engine
from app.db.session import initialize_database
from app.models.report import Report
from app.schemas.report import ReportCreate
from app.services.hotspot import HotspotService

SYNTHETIC_PREFIX = "[SYNTHETIC DEMO]"
SEED_VERSION = "bengaluru-v1"

_REPORTS = [
    ("MG Road crossing", 12.97160, 77.59460, "Pedestrian conflict", 5,
     "A turning car stopped suddenly to avoid a pedestrian at the MG Road crossing.", 0),
    ("MG Road signal", 12.97172, 77.59464, "Sudden braking", 4,
     "A driver braked hard when another vehicle entered the MG Road junction.", 1),
    ("MG Road cycle lane", 12.97181, 77.59457, "Near collision", 3,
     "A cyclist and a turning vehicle nearly collided beside the MG Road junction.", 2),
    ("MG Road bus stop", 12.97149, 77.59470, "Dangerous overtaking", 2,
     "A bus pulled away as a nearby car attempted a risky overtake.", 3),
    ("Koramangala turn", 12.93520, 77.62450, "Dangerous overtaking", 4,
     "A vehicle overtook near the Koramangala turn and forced another driver to slow.", 0),
    ("Koramangala crosswalk", 12.93528, 77.62458, "Pedestrian conflict", 5,
     "A pedestrian stepped back as a vehicle turned across the marked Koramangala crossing.", 1),
    ("Koramangala lane merge", 12.93535, 77.62445, "Near collision", 3,
     "Two vehicles merged into the same Koramangala lane and narrowly avoided contact.", 2),
    ("Koramangala market road", 12.93512, 77.62442, "Sudden braking", 2,
     "A delivery vehicle braked suddenly near a busy Koramangala market entrance.", 3),
    ("Indiranagar 100 Feet Road", 12.97840, 77.64080, "Near collision", 1,
     "A car and scooter nearly collided while entering 100 Feet Road in Indiranagar.", 0),
    ("Indiranagar metro junction", 12.97851, 77.64086, "Sudden braking", 2,
     "A scooter rider braked abruptly when a car turned across the Indiranagar junction.", 1),
    ("Indiranagar school crossing", 12.97831, 77.64092, "Pedestrian conflict", 4,
     "A driver stopped just in time for a pedestrian at the Indiranagar school crossing.", 2),
    ("Indiranagar bus lane", 12.97845, 77.64068, "Dangerous overtaking", 3,
     "A vehicle made a close overtake beside a bus near the Indiranagar metro.", 3),
    ("Isolated Hebbal approach", 13.03580, 77.59700, "Poor road condition", 2,
     "A pothole caused a vehicle to swerve on an otherwise quiet Hebbal approach.", 4),
    ("Isolated airport road", 13.19860, 77.70660, "Sudden braking", 4,
     "A driver slowed after noticing loose debris on the road toward the airport.", 5),
    ("Isolated Yelahanka road", 13.10070, 77.59630, "Near collision", 3,
     "A cyclist moved around a parked vehicle near a Yelahanka service road.", 6),
    ("Isolated Jayanagar junction", 12.92500, 77.58380, "Pedestrian conflict", 5,
     "A turning vehicle came close to a pedestrian at a Jayanagar junction.", 7),
    ("Isolated Whitefield crossing", 12.96980, 77.75000, "Sudden braking", 1,
     "A car braked to avoid a vehicle stopping near a Whitefield crossing.", 8),
    ("Isolated Banashankari road", 12.92550, 77.56500, "Poor road condition", 2,
     "A shallow road defect caused a motorcyclist to change direction in Banashankari.", 9),
    ("Isolated Electronic City ramp", 12.84520, 77.66000, "Dangerous overtaking", 4,
     "A vehicle made a risky lane change on an Electronic City approach ramp.", 10),
    ("Isolated Malleshwaram street", 13.00300, 77.57000, "Near collision", 3,
     "Two cars approached a narrow Malleshwaram street from opposite directions.", 11),
]


@dataclass(frozen=True)
class SeedResult:
    inserted: int
    already_present: int
    synthetic_total: int
    cluster_count: int
    hotspot_summary: tuple[tuple[int, int, float, str], ...]


def ensure_existing_database(database_engine: Engine = engine) -> None:
    if database_engine.dialect.name == "sqlite":
        database_path = database_engine.url.database
        if not database_path or database_path == ":memory:":
            raise RuntimeError("Demo seeding requires an existing persistent SQLite database")
        if not Path(database_path).is_file():
            raise FileNotFoundError(
                f"Configured SQLite database does not exist: {Path(database_path).resolve()}"
            )
    if not inspect(database_engine).has_table("reports"):
        raise RuntimeError(
            "The configured database has no reports table; refusing to create or initialize a database"
        )


def _report_values(item: tuple, today: date) -> dict:
    label, latitude, longitude, category, severity, description, days_ago = item
    occurred_at = datetime.combine(
        today - timedelta(days=days_ago),
        time(hour=9 + days_ago % 8, minute=15),
        tzinfo=timezone.utc,
    )
    return {
        "title": f"{SYNTHETIC_PREFIX} {label}",
        "latitude": latitude,
        "longitude": longitude,
        "description": description,
        "category": category,
        "severity": severity,
        "incident_datetime": occurred_at,
        "evidence_available": False,
        "image_url": None,
        "location_source": "map",
    }


def seed_reports(db: Session, today: Optional[date] = None) -> SeedResult:
    """Insert missing seed rows; existing reports and their IDs are preserved."""
    seed_day = today or datetime.now(timezone.utc).date()
    inserted = 0
    already_present = 0

    for index, item in enumerate(_REPORTS, start=1):
        values = _report_values(item, seed_day)
        submission_key = f"synthetic-{SEED_VERSION}-{index:02d}"
        existing = (
            db.query(Report)
            .filter(
                (Report.submission_key == submission_key)
                | (Report.title == values["title"])
            )
            .first()
        )
        if existing is not None:
            if existing.submission_key is None:
                existing.submission_key = submission_key
            existing.title = values["title"]
            if not existing.attachments and not existing.image_url:
                existing.evidence_available = False
            already_present += 1
            continue

        validated = ReportCreate(**values)
        db.add(
            Report(
                **validated.model_dump(),
                submission_key=submission_key,
            )
        )
        inserted += 1

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    synthetic_reports = (
        db.query(Report)
        .filter(Report.title.like(f"{SYNTHETIC_PREFIX}%"))
        .order_by(Report.id)
        .all()
    )
    hotspots = HotspotService.get_hotspots(synthetic_reports)
    clustered = [hotspot for hotspot in hotspots if not hotspot["is_noise"]]
    summary = tuple(
        (
            hotspot["report_count"],
            len(hotspot["report_ids"]),
            hotspot["risk_score"],
            hotspot["risk_classification"],
        )
        for hotspot in clustered
    )
    return SeedResult(
        inserted=inserted,
        already_present=already_present,
        synthetic_total=len(synthetic_reports),
        cluster_count=len(clustered),
        hotspot_summary=summary,
    )


def main() -> None:
    ensure_existing_database()
    initialize_database()
    with SessionLocal() as db:
        result = seed_reports(db)
    print(
        f"{SYNTHETIC_PREFIX} seeding complete: inserted {result.inserted}; "
        f"already present {result.already_present}; "
        f"labelled reports {result.synthetic_total}; "
        f"DBSCAN clusters {result.cluster_count}."
    )
    for index, (report_count, _, risk_score, classification) in enumerate(
        result.hotspot_summary,
        start=1,
    ):
        print(
            f"  Cluster {index}: {report_count} reports, "
            f"risk {risk_score:.2f} ({classification})"
        )
    print("Synthetic reports have no attached evidence; evidence_available is false.")


if __name__ == "__main__":
    main()
