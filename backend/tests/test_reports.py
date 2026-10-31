from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.deps import get_db
from app.db.base import Base
from app.main import app


@pytest.fixture
def client(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'reports.sqlite'}",
        connect_args={"check_same_thread": False},
    )
    testing_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def valid_report(**updates):
    report = {
        "latitude": 40.7128,
        "longitude": -74.006,
        "description": "A vehicle turned across my path.",
        "severity": 3,
        "incident_datetime": datetime(2026, 10, 30, 12, 15, tzinfo=timezone.utc).isoformat(),
        "evidence_available": True,
        "image_url": "https://example.com/evidence.jpg",
    }
    report.update(updates)
    return report


def test_create_report_and_retrieve_it(client):
    response = client.post("/api/v1/reports", json=valid_report())

    assert response.status_code == 201
    report = response.json()
    assert report["id"] == 1
    assert report["latitude"] == 40.7128
    assert report["longitude"] == -74.006
    assert report["description"] == "A vehicle turned across my path."
    assert report["severity"] == 3
    assert report["incident_datetime"].startswith("2026-10-30T12:15:00")
    assert report["evidence_available"] is True
    assert report["image_url"] == "https://example.com/evidence.jpg"
    assert report["created_at"]

    by_id = client.get(f"/api/v1/reports/{report['id']}")
    assert by_id.status_code == 200
    assert by_id.json() == report

    all_reports = client.get("/api/v1/reports")
    assert all_reports.status_code == 200
    assert all_reports.json() == [report]


def test_create_report_without_image_url(client):
    response = client.post(
        "/api/v1/reports",
        json=valid_report(evidence_available=False, image_url=None),
    )

    assert response.status_code == 201
    assert response.json()["evidence_available"] is False
    assert response.json()["image_url"] is None


def test_create_report_accepts_legacy_location_fields(client):
    report = valid_report()
    report["location_lat"] = report.pop("latitude")
    report["location_lng"] = report.pop("longitude")

    response = client.post("/api/v1/reports", json=report)

    assert response.status_code == 201
    assert response.json()["latitude"] == 40.7128
    assert response.json()["longitude"] == -74.006


@pytest.mark.parametrize(
    "updates",
    [
        {"latitude": 91},
        {"longitude": -181},
        {"severity": 0},
        {"severity": 6},
        {"severity": True},
        {"description": "   "},
        {"incident_datetime": "not-a-date"},
        {"image_url": "not-a-url"},
        {"evidence_available": "yes"},
        {"latitude": None},
    ],
)
def test_reject_invalid_report_data(client, updates):
    response = client.post("/api/v1/reports", json=valid_report(**updates))

    assert response.status_code == 422


def test_reject_missing_required_fields(client):
    report = valid_report()
    del report["description"]

    response = client.post("/api/v1/reports", json=report)

    assert response.status_code == 422


def test_list_reports_supports_pagination(client):
    client.post("/api/v1/reports", json=valid_report())
    client.post("/api/v1/reports", json=valid_report(description="Another incident"))

    response = client.get("/api/v1/reports?skip=1&limit=1")

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_report_routes_are_documented(client):
    openapi_response = client.get("/api/v1/openapi.json")

    assert openapi_response.status_code == 200
    openapi = openapi_response.json()
    report_path = openapi["paths"]["/api/v1/reports"]
    assert report_path["post"]["responses"]["201"]
    assert openapi["paths"]["/api/v1/reports/{report_id}"]["get"]["responses"]["200"]
    assert openapi["paths"]["/api/v1/reports/{report_id}"]["delete"]["responses"]["204"]

    request_ref = report_path["post"]["requestBody"]["content"]["application/json"]["schema"]["$ref"]
    request_schema_name = request_ref.rsplit("/", 1)[-1]
    request_schema = openapi["components"]["schemas"][request_schema_name]
    assert {
        "latitude",
        "longitude",
        "description",
        "severity",
        "incident_datetime",
        "evidence_available",
        "image_url",
    }.issubset(request_schema["properties"])


def test_missing_report_returns_not_found(client):
    response = client.get("/api/v1/reports/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Report not found"}


def test_delete_report(client):
    created = client.post("/api/v1/reports", json=valid_report())
    report_id = created.json()["id"]

    response = client.delete(f"/api/v1/reports/{report_id}")

    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/api/v1/reports/{report_id}").status_code == 404
    assert client.delete(f"/api/v1/reports/{report_id}").status_code == 404
