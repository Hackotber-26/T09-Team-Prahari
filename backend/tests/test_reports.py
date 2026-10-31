from io import BytesIO
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from starlette.datastructures import Headers, UploadFile

from app.api.deps import get_db
from app.core.config import settings
from app.db.base import Base
from app.main import app
from app.models.report import EvidenceAttachment, Report
from app.schemas.report import ReportCreate
from app.services.report import ReportService
from app.services.semantic_similarity import (
    SemanticAnalysisError,
    semantic_similarity_service,
)


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
    response = client.post(
        "/api/v1/reports",
        json=valid_report(
            location_name="Market Street, Bengaluru",
            location_source="map",
        ),
    )

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
    assert report["location_name"] == "Market Street, Bengaluru"
    assert report["title"] == "Market Street, Bengaluru"
    assert report["location_source"] == "map"
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


def test_reject_report_without_incident_coordinates(client):
    report = valid_report()
    del report["latitude"]

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


def test_health_endpoint_checks_database_and_docs_are_available(client):
    assert client.get("/health").json() == {
        "status": "healthy",
        "service": "NearMiss Atlas",
    }
    assert client.get("/docs").status_code == 200


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


def test_idempotency_key_prevents_duplicate_report_creation(client):
    first = client.post(
        "/api/v1/reports",
        json=valid_report(),
        headers={"Idempotency-Key": "submission-1"},
    )
    retry = client.post(
        "/api/v1/reports",
        json=valid_report(description="A changed retry payload"),
        headers={"Idempotency-Key": "submission-1"},
    )

    assert first.status_code == retry.status_code == 201
    assert first.json()["id"] == retry.json()["id"]
    assert len(client.get("/api/v1/reports").json()) == 1


def test_upload_and_download_supporting_documents(client, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "UPLOAD_DIRECTORY", str(tmp_path / "uploads"))
    created = client.post("/api/v1/reports", json=valid_report(evidence_available=False))
    report_id = created.json()["id"]
    pdf_content = b"%PDF-1.7\nsynthetic pdf evidence"
    png_content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 24

    upload = client.post(
        f"/api/v1/reports/{report_id}/evidence",
        files=[
            ("files", ("crossing.pdf", pdf_content, "application/pdf")),
            ("files", ("road.png", png_content, "image/png")),
        ],
    )

    assert upload.status_code == 201
    assert upload.json()[0]["filename"] == "crossing.pdf"
    assert upload.json()[0]["content_type"] == "application/pdf"
    assert upload.json()[0]["size_bytes"] == len(pdf_content)
    assert upload.json()[1]["content_type"] == "image/png"
    assert len({item["id"] for item in upload.json()}) == 2

    retrieved = client.get(f"/api/v1/reports/{report_id}")
    assert retrieved.status_code == 200
    assert retrieved.json()["evidence_available"] is True
    assert len(retrieved.json()["attachments"]) == 2
    assert retrieved.json()["latitude"] == 40.7128
    assert retrieved.json()["longitude"] == -74.006

    metadata = client.get(f"/api/v1/reports/{report_id}/evidence")
    assert metadata.status_code == 200
    assert [attachment["filename"] for attachment in metadata.json()] == [
        "crossing.pdf",
        "road.png",
    ]

    download = client.get(retrieved.json()["attachments"][0]["download_url"])
    assert download.status_code == 200
    assert download.content == pdf_content

    duplicate = client.post(
        f"/api/v1/reports/{report_id}/attachments",
        files={"files": ("renamed.pdf", pdf_content, "application/pdf")},
    )
    assert duplicate.status_code == 201
    assert len(client.get(f"/api/v1/reports/{report_id}").json()["attachments"]) == 2

    assert client.delete(f"/api/v1/reports/{report_id}").status_code == 204
    assert not list((tmp_path / "uploads").iterdir())


def test_upload_rejects_unsupported_and_oversized_files(client, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "UPLOAD_DIRECTORY", str(tmp_path / "uploads"))
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", 4)
    report_id = client.post("/api/v1/reports", json=valid_report()).json()["id"]

    unsupported = client.post(
        f"/api/v1/reports/{report_id}/attachments",
        files={"files": ("program.exe", b"file", "application/octet-stream")},
    )
    oversized = client.post(
        f"/api/v1/reports/{report_id}/attachments",
        files={"files": ("evidence.pdf", b"too large", "application/pdf")},
    )

    assert unsupported.status_code == 422
    assert "Unsupported evidence file type" in unsupported.json()["detail"]
    assert oversized.status_code == 422
    assert "per-file limit" in oversized.json()["detail"]


def test_upload_rejects_mismatched_mime_and_invalid_file_signature(client, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "UPLOAD_DIRECTORY", str(tmp_path / "uploads"))
    report_id = client.post("/api/v1/reports", json=valid_report()).json()["id"]

    mismatched = client.post(
        f"/api/v1/reports/{report_id}/evidence",
        files={"files": ("proof.pdf", b"\x89PNG\r\n\x1a\n" + b"\x00" * 24, "image/png")},
    )
    invalid_signature = client.post(
        f"/api/v1/reports/{report_id}/evidence",
        files={"files": ("proof.pdf", b"not a PDF", "application/pdf")},
    )
    incorrect_declared_type = client.post(
        f"/api/v1/reports/{report_id}/evidence",
        files={"files": ("proof.png", b"\x89PNG\r\n\x1a\n" + b"\x00" * 24, "image/jpeg")},
    )

    assert mismatched.status_code == 422
    assert "does not match" in mismatched.json()["detail"]
    assert invalid_signature.status_code == 422
    assert "does not match" in invalid_signature.json()["detail"]
    assert incorrect_declared_type.status_code == 422
    assert "content type does not match" in incorrect_declared_type.json()["detail"]


def test_evidence_routes_handle_missing_report_and_missing_file(client, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "UPLOAD_DIRECTORY", str(tmp_path / "uploads"))
    assert client.get("/api/v1/reports/999/evidence").status_code == 404
    assert client.post(
        "/api/v1/reports/999/evidence",
        files={"files": ("proof.pdf", b"%PDF-1.7\n", "application/pdf")},
    ).status_code == 404

    report_id = client.post("/api/v1/reports", json=valid_report()).json()["id"]
    uploaded = client.post(
        f"/api/v1/reports/{report_id}/evidence",
        files={"files": ("proof.pdf", b"%PDF-1.7\n", "application/pdf")},
    ).json()[0]
    next((tmp_path / "uploads").iterdir()).unlink()
    unavailable = client.get(uploaded["download_url"])

    assert unavailable.status_code == 404
    assert unavailable.json()["detail"] == "Evidence file is unavailable"


def test_report_and_evidence_survive_database_reopen(monkeypatch, tmp_path):
    database_path = tmp_path / "persistent.sqlite"
    evidence_path = tmp_path / "persistent-evidence"
    monkeypatch.setattr(settings, "UPLOAD_DIRECTORY", str(evidence_path))
    engine = create_engine(
        f"sqlite:///{database_path}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    sessions = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    pdf_content = b"%PDF-1.7\npersistent evidence"

    with sessions() as db:
        report = ReportService.create_report(
            db,
            ReportCreate(**valid_report(location_name="Saved map location")),
        )
        attachments = ReportService.save_attachments(
            db,
            report,
            [
                UploadFile(
                    filename="evidence.pdf",
                    file=BytesIO(pdf_content),
                    headers=Headers({"content-type": "application/pdf"}),
                )
            ],
        )
        attachment_id = attachments[0].id
        storage_name = attachments[0].storage_name

    engine.dispose()
    reopened_engine = create_engine(
        f"sqlite:///{database_path}",
        connect_args={"check_same_thread": False},
    )
    reopened_sessions = sessionmaker(bind=reopened_engine)
    with reopened_sessions() as db:
        report = db.query(Report).one()
        attachment = db.query(EvidenceAttachment).filter_by(id=attachment_id).one()
        assert report.title == report.location_name == "Saved map location"
        assert (report.latitude, report.longitude) == (40.7128, -74.006)
        assert attachment.report_id == report.id
        assert attachment.storage_name == storage_name
        assert (evidence_path / storage_name).read_bytes() == pdf_content
    reopened_engine.dispose()


def test_semantic_similarity_route_returns_matches_and_notice(client, monkeypatch):
    first = client.post("/api/v1/reports", json=valid_report())
    second = client.post(
        "/api/v1/reports",
        json=valid_report(description="A cyclist was nearly hit at the junction."),
    )

    def fake_matches(report, reports, threshold):
        assert threshold == pytest.approx(0.55)
        assert len(reports) == 2
        return [
            SimpleNamespace(
                report_id=second.json()["id"],
                description="A cyclist was nearly hit at the junction.",
                similarity_score=0.82,
            )
        ]

    monkeypatch.setattr(
        semantic_similarity_service,
        "find_similar_reports",
        fake_matches,
    )
    response = client.get(f"/api/v1/reports/{first.json()['id']}/similar")

    assert response.status_code == 200
    assert response.json()["matches"][0]["similarity_score"] == pytest.approx(0.82)
    assert "does not prove" in response.json()["notice"]


def test_semantic_similarity_route_handles_missing_report_and_model_failure(client, monkeypatch):
    assert client.get("/api/v1/reports/999/similar").status_code == 404
    created = client.post("/api/v1/reports", json=valid_report())

    def fail_to_analyze(*_args, **_kwargs):
        raise SemanticAnalysisError("model files unavailable")

    monkeypatch.setattr(
        semantic_similarity_service,
        "find_similar_reports",
        fail_to_analyze,
    )
    response = client.get(f"/api/v1/reports/{created.json()['id']}/similar")

    assert response.status_code == 503
    assert "temporarily unavailable" in response.json()["detail"]
