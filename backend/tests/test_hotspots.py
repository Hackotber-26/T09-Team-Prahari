from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.deps import get_db
from app.core.config import Settings
from app.db.base import Base
from app.main import app
from app.models.report import Report
from app.services.hotspot import cluster_reports
from app.services.risk import calculate_risk_score


@pytest.fixture
def db_session(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'hotspots.sqlite'}",
        connect_args={"check_same_thread": False},
    )
    testing_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = testing_session()

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield db
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture
def client(db_session):
    with TestClient(app) as test_client:
        yield test_client


def report(report_id, latitude, longitude, severity=3, evidence_available=False):
    return SimpleNamespace(
        id=report_id,
        latitude=latitude,
        longitude=longitude,
        severity=severity,
        evidence_available=evidence_available,
    )


def db_report(latitude, longitude, severity=3, evidence_available=False):
    return Report(
        description="A vehicle nearly hit a cyclist.",
        latitude=latitude,
        longitude=longitude,
        severity=severity,
        evidence_available=evidence_available,
        incident_datetime=datetime(2026, 10, 31, tzinfo=timezone.utc),
    )


def test_cluster_reports_groups_close_locations_and_returns_centres():
    reports = [
        report(3, 40.0, -73.0, severity=5, evidence_available=True),
        report(1, 40.0001, -73.0, severity=3),
        report(2, 40.0002, -73.0, severity=4),
    ]

    clusters = cluster_reports(reports)

    assert len(clusters) == 1
    assert clusters[0].cluster_id == 0
    assert clusters[0].is_noise is False
    assert [item.id for item in clusters[0].reports] == [1, 2, 3]
    assert clusters[0].latitude == pytest.approx(40.0001)
    assert clusters[0].longitude == pytest.approx(-73.0)


def test_cluster_noise_reports_are_preserved_as_individual_outliers():
    reports = [report(1, 40.0, -73.0), report(2, 40.01, -73.01)]

    clusters = cluster_reports(reports)

    assert len(clusters) == len(reports)
    assert all(cluster.cluster_id == -1 and cluster.is_noise for cluster in clusters)
    assert [[item.id for item in cluster.reports] for cluster in clusters] == [[1], [2]]


def test_cluster_reports_handles_dateline_centres():
    reports = [
        report(1, 0.0, 179.999),
        report(2, 0.0, -179.999),
        report(3, 0.0, 179.9995),
    ]

    clusters = cluster_reports(reports)

    assert len(clusters) == 1
    assert clusters[0].is_noise is False
    assert abs(clusters[0].longitude) == pytest.approx(180.0, abs=0.001)


def test_cluster_reports_empty_input():
    assert cluster_reports([]) == []


@pytest.mark.parametrize(
    ("latitude", "longitude"),
    [
        (91.0, 0.0),
        (0.0, 181.0),
        (float("nan"), 0.0),
        (None, 0.0),
    ],
)
def test_cluster_reports_rejects_invalid_coordinates(latitude, longitude):
    with pytest.raises(ValueError, match="invalid latitude or longitude"):
        cluster_reports([report(17, latitude, longitude)])


def test_calculate_risk_score_uses_documented_formula():
    reports = [
        report(1, 0.0, 0.0, severity=5, evidence_available=True),
        report(2, 0.0, 0.0, severity=3, evidence_available=False),
    ]

    risk = calculate_risk_score(reports)

    assert risk.average_severity == pytest.approx(4.0)
    assert risk.evidence_ratio == pytest.approx(0.5)
    assert risk.score == pytest.approx(51.5)
    assert risk.classification == "Medium"


def test_calculate_risk_score_low_and_high_classifications():
    low = calculate_risk_score([report(1, 0.0, 0.0, severity=1)])
    high_reports = [report(i, 0.0, 0.0, severity=5, evidence_available=True) for i in range(10)]
    high = calculate_risk_score(high_reports)

    assert low.score == pytest.approx(11.5)
    assert low.classification == "Low"
    assert high.score == pytest.approx(100.0)
    assert high.classification == "High"


def test_calculate_risk_score_empty_reports():
    risk = calculate_risk_score([])

    assert risk.average_severity == 0.0
    assert risk.evidence_ratio == 0.0
    assert risk.score == 0.0
    assert risk.classification == "Low"


def test_risk_configuration_is_applied_and_weights_must_sum_to_one():
    custom_settings = Settings(
        RISK_SEVERITY_WEIGHT=0.5,
        RISK_FREQUENCY_WEIGHT=0.3,
        RISK_EVIDENCE_WEIGHT=0.2,
        RISK_MEDIUM_THRESHOLD=20.0,
        RISK_HIGH_THRESHOLD=30.0,
    )
    risk = calculate_risk_score(
        [report(1, 0.0, 0.0, severity=1)],
        config=custom_settings,
    )

    assert risk.score == pytest.approx(13.0)
    assert risk.classification == "Low"
    with pytest.raises(ValueError, match="weights must sum to 1"):
        Settings(RISK_SEVERITY_WEIGHT=0.5)


@pytest.mark.parametrize(
    ("severities", "expected_classification"),
    [([2], "Medium"), ([3, 4], "High")],
)
def test_risk_classification_thresholds(severities, expected_classification):
    config = Settings(
        RISK_SEVERITY_WEIGHT=1.0,
        RISK_FREQUENCY_WEIGHT=0.0,
        RISK_EVIDENCE_WEIGHT=0.0,
    )
    risk = calculate_risk_score(
        [
            report(index, 0.0, 0.0, severity=severity)
            for index, severity in enumerate(severities, start=1)
        ],
        config=config,
    )

    assert risk.classification == expected_classification


def test_hotspot_endpoint_returns_clusters_and_noise(client, db_session):
    db_session.add_all(
        [
            db_report(40.0, -73.0, severity=5, evidence_available=True),
            db_report(40.0001, -73.0, severity=3),
            db_report(40.0002, -73.0, severity=4, evidence_available=True),
            db_report(41.0, -74.0, severity=1),
        ]
    )
    db_session.commit()
    reports = db_session.query(Report).order_by(Report.id).all()

    response = client.get("/api/v1/hotspots")

    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] == 2
    cluster = next(item for item in payload["hotspots"] if not item["is_noise"])
    outlier = next(item for item in payload["hotspots"] if item["is_noise"])
    assert cluster["report_count"] == 3
    assert cluster["report_ids"] == [item.id for item in reports[:3]]
    assert cluster["average_severity"] == pytest.approx(4.0)
    assert cluster["evidence_ratio"] == pytest.approx(2 / 3)
    assert cluster["risk_score"] == pytest.approx(59.17, abs=0.01)
    assert cluster["risk_classification"] == "Medium"
    assert outlier["cluster_id"] == -1
    assert outlier["report_count"] == 1
    assert outlier["report_ids"] == [reports[3].id]


def test_hotspot_endpoint_empty_data_returns_empty_list(client):
    response = client.get("/api/v1/hotspots")

    assert response.status_code == 200
    assert response.json() == {"hotspots": [], "count": 0}


def test_hotspot_endpoint_rejects_invalid_persisted_coordinates(client, db_session):
    db_session.add(db_report(91.0, -73.0))
    db_session.commit()

    response = client.get("/api/v1/hotspots")

    assert response.status_code == 422
    assert "invalid latitude or longitude" in response.json()["detail"]


def test_submitted_coordinates_are_saved_and_used_for_hotspot_clustering(client, db_session):
    coordinates = [
        (12.9716, 77.5946),
        (12.9717, 77.5946),
        (12.9718, 77.5946),
    ]
    report_ids = []
    for latitude, longitude in coordinates:
        response = client.post(
            "/api/v1/reports",
            json={
                "latitude": latitude,
                "longitude": longitude,
                "description": "A vehicle nearly hit a cyclist.",
                "severity": 3,
                "incident_datetime": "2026-10-31T12:00:00Z",
                "evidence_available": False,
            },
        )
        assert response.status_code == 201
        report_ids.append(response.json()["id"])

    saved_reports = db_session.query(Report).order_by(Report.id).all()
    assert [(item.latitude, item.longitude) for item in saved_reports] == coordinates

    hotspots_response = client.get("/api/v1/hotspots")

    assert hotspots_response.status_code == 200
    cluster = next(
        hotspot
        for hotspot in hotspots_response.json()["hotspots"]
        if not hotspot["is_noise"]
    )
    assert cluster["report_ids"] == report_ids
    assert cluster["report_count"] == len(coordinates)
