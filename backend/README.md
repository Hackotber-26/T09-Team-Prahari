# NearMiss Atlas Backend

FastAPI backend for NearMiss Atlas - Don't Wait for the Crash.

## Setup

From the `backend` directory:

```bash
py -3.14 -m venv venv
```

The pinned dependencies support Python 3.14 on Windows. On macOS/Linux, use `python3.14 -m venv venv` instead. Activate the environment (`venv\Scripts\activate` on Windows, or `source venv/bin/activate` on macOS/Linux), then install dependencies:

```bash
python -m pip install --only-binary=:all: -r requirements.txt
```

## Run

Start the API from the `backend` directory:

```bash
uvicorn app.main:app --reload
```

The SQLite database is stored at `backend/nearmiss.db` by default. Override `DATABASE_URL` in the environment or `.env` to use a different database URL.

## Report API

Interactive OpenAPI documentation is available at `/docs` (ReDoc at `/redoc`).

All report routes use the `/api/v1/reports` prefix.

### Submit a report

`POST /api/v1/reports` returns `201 Created`.

```json
{
  "latitude": 40.7128,
  "longitude": -74.006,
  "description": "A vehicle turned across my path.",
  "severity": 3,
  "incident_datetime": "2026-10-30T12:15:00Z",
  "evidence_available": true,
  "image_url": "https://example.com/evidence.jpg"
}
```

Latitude must be between -90 and 90, longitude between -180 and 180, and severity an integer from 1 to 5. Description, incident date/time, and evidence availability are required. `image_url` is optional and must be an HTTP(S) URL when supplied. Date/time values should use ISO 8601 format; timestamps with a timezone are recommended. Invalid request data returns `422 Unprocessable Entity`.

### Retrieve reports

- `GET /api/v1/reports` returns reports, newest first. Optional `skip` (default `0`) and `limit` (default `100`, maximum `1000`) query parameters support pagination.
- `GET /api/v1/reports/{report_id}` returns one report or `404 Not Found`.

Responses include the report ID and creation/update timestamps.

### Delete a report

`DELETE /api/v1/reports/{report_id}` returns `204 No Content` when deleted, or `404 Not Found` when the ID does not exist.

## Other endpoints

- `GET /health` - Health check
- `GET /api/v1/hotspots` - Hotspot endpoint (currently returns no computed hotspots)

## Tests

Run the backend test suite from the `backend` directory:

```bash
python -m pytest
```
