# NearMiss Atlas API

FastAPI service for NearMiss Atlas. The default database is persistent SQLite at `backend/nearmiss.db`; uploaded evidence is stored under `backend/uploads`.

## Windows PowerShell setup

From `backend/`:

```powershell
py -3.14 -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --only-binary=:all: -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

Swagger is available at `http://localhost:8000/docs`; health is `http://localhost:8000/health`. Run tests with `python -m pytest -q`.

The semantic model `sentence-transformers/all-MiniLM-L6-v2` loads lazily on the first similarity query, is cached for the process lifetime, and runs on CPU. The initial download requires internet. An unavailable model returns `503` for semantic analysis but does not prevent reports, hotspots or the rest of the API from starting.

Location selection is handled in the existing React form: users can click/drag the Leaflet map pin, choose a Nominatim search result, or request browser GPS after clicking the location button. GPS is optional; coordinates require review before submission. Geolocation requires HTTPS or localhost and can be denied without preventing search/map selection. Public Nominatim is rate-limited; follow its attribution and usage policy.

## Environment

Copy `.env.example` to `.env`. Important settings:

- `DATABASE_URL`: SQLAlchemy URL; default `sqlite:///./nearmiss.db`.
- `BACKEND_CORS_ORIGINS`: JSON array including the Vite origins.
- `UPLOAD_DIRECTORY`: local evidence folder; default `uploads`.
- `MAX_UPLOAD_SIZE_BYTES`: 25 MiB per file by default.
- `MAX_ATTACHMENTS_PER_REPORT`: 10 by default.
- `SEMANTIC_MODEL_NAME`, `SEMANTIC_SIMILARITY_THRESHOLD`: model and threshold (0.55).
- `HOTSPOT_RADIUS_METERS`, `HOTSPOT_MIN_SAMPLES`, `EARTH_RADIUS_KM`: DBSCAN configuration (500 m, 3, 6371 km).
- `RISK_SEVERITY_WEIGHT`, `RISK_FREQUENCY_WEIGHT`, `RISK_EVIDENCE_WEIGHT`, `RISK_FREQUENCY_REPORTS`, `RISK_MEDIUM_THRESHOLD`, `RISK_HIGH_THRESHOLD`: prototype risk configuration.

Tables are initialized on startup. A small additive SQLite migration supports existing report tables when idempotency and location-source metadata are added. Reports are not cleared when the API restarts.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/v1/reports` | Save a near-miss report; `201` |
| GET | `/api/v1/reports` | List reports; optional `skip` and `limit` |
| GET | `/api/v1/reports/{report_id}` | Retrieve a saved report and evidence metadata |
| DELETE | `/api/v1/reports/{report_id}` | Delete a report and its stored evidence |
| POST | `/api/v1/reports/{report_id}/evidence` | Upload one or more multipart `files` (JPG/JPEG, PNG, WEBP, PDF) |
| GET | `/api/v1/reports/{report_id}/evidence` | Retrieve evidence metadata and report-scoped URLs |
| POST | `/api/v1/reports/{report_id}/attachments` | Legacy alias for evidence upload |
| GET | `/api/v1/reports/{report_id}/attachments/{attachment_id}` | Open/download an attachment |
| GET | `/api/v1/reports/{report_id}/similar` | Compare semantic description similarity |
| GET | `/api/v1/hotspots` | Get DBSCAN clusters and isolated reports |

Report creation requires numeric latitude/longitude, non-blank description, severity 1–5, ISO incident date/time, and a boolean evidence flag. A readable location label is accepted as `location_name` or the legacy `title` and returned as both fields. The optional `Idempotency-Key` header prevents duplicate report records when clients retry. Coordinates are range-validated and are the values used for clustering.

Evidence uploads accept JPG/JPEG, PNG, WEBP, and PDF only, with a configurable `MAX_UPLOAD_SIZE_BYTES` limit (25 MiB per file by default) and at most 10 files per report by default. The backend checks filename extension, content signature, and declared content type. Stored files use random server-generated names in `UPLOAD_DIRECTORY` (default `backend/uploads`); original filenames and canonical MIME types are metadata in SQLite. The attachment table references the report and stores the file size, digest, and download metadata. Unsupported, mismatched, or oversized files return `422`; disk paths are never returned to the frontend. Uploads are persisted separately after report creation, and the frontend reports upload failures rather than indicating success.

An uploaded file means supporting material was supplied; it is not proof that the incident occurred. Evidence availability in the prototype risk formula is not a verification claim. The prototype has no authentication/authorization system, so evidence routes use the same public access model as reports; add access control before deployment with private data.

## Geographical hotspots and risk

DBSCAN uses Haversine distance, radians, Earth radius 6371 km, initial radius 500 m and `min_samples=3`. Cluster centres are spherical centroids. DBSCAN noise points remain in the response as individual isolated entries with label `-1`.

The experimental score is `R = 100 × (0.40 × S + 0.35 × F + 0.25 × C)`, where `S = average severity / 5`, `F = min(report count / 10, 1)`, and `C = reports with evidence / total reports`. Classes are Low (0–39), Medium (40–69), and High (70–100). This score is not a validated accident probability or official safety standard.

## Synthetic demo dataset

From `backend/`, run this exact PowerShell command:

```powershell
.\venv\Scripts\python.exe .\seed_demo.py
```

The script uses the existing `DATABASE_URL` setting (default `sqlite:///./nearmiss.db`), and never creates a replacement database or deletes user records. It inserts 20 labelled `[SYNTHETIC DEMO]` Bengaluru reports: three four-report DBSCAN groups plus eight isolated reports, varied severity and incident dates, and similar descriptions for semantic checks. The stable synthetic submission keys make repeat runs idempotent. No evidence files are fabricated; seeded records have `evidence_available=false`. These records are fabricated examples and must not be presented as actual incidents.

## Semantic similarity

`GET /api/v1/reports/{report_id}/similar?threshold=0.55` returns matching report IDs, descriptions and cosine similarity scores. It compares all other persisted descriptions. The endpoint requires `sentence-transformers/all-MiniLM-L6-v2`; model errors return `503`, missing report IDs return `404`. A similarity score is exploratory text resemblance, not proof of the same event or an automatic risk rating.

## Tests

```powershell
python -m pytest -q
```
