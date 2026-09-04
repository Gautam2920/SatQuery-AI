# SatQuery AI — backend

The FastAPI service. It owns the REST surface, PostgreSQL/PostGIS persistence,
raster ingestion, the deterministic geospatial layer, and the orchestration that
invokes the AI/ML package.

## Purpose

Sit between the React workspace and the `satquery_ai` package, and enforce the
project's governing split:

> **AI interprets; deterministic software calculates.**

The model decides which pixels belong together. Every geographic quantity — the
polygons, areas, perimeters and coordinates that end up on screen — is computed
here from the raster's own affine transform and CRS, so no measurement is ever a
model output.

## Tech stack

| Concern | Choice |
|---|---|
| Framework | FastAPI + Uvicorn |
| Validation | Pydantic v2 / pydantic-settings |
| ORM | SQLAlchemy 2.0 (`Mapped` / `mapped_column`) |
| Migrations | Alembic |
| Database | PostgreSQL + PostGIS (via GeoAlchemy2) |
| Raster I/O | rasterio |
| Geometry / CRS | shapely, pyproj, scipy (connected components) |
| Preview rendering | Pillow |
| AI/ML | `satquery_ai`, imported in-process |
| Tests | pytest + `fastapi.testclient` |

## Architecture

```
app/
  main.py                 app construction, CORS, router registration, /health
  core/config.py          Settings (pydantic-settings, reads backend/.env)
  api/
    dependencies.py       get_db — request-scoped SQLAlchemy session
    projects.py           /projects
    images.py             /projects/{id}/images
    image_search.py       /images/search
    analysis.py           /images/{id}/analysis, /images/{id}/preview
  db/
    base.py               DeclarativeBase
    session.py            engine + SessionLocal
  models/                 Project, Image (SQLAlchemy)
  schemas/                Pydantic request/response models
    raster.py             RasterBounds, RasterMetadata
    image.py              ImageResponse
    project.py            ProjectCreate, ProjectResponse
    analysis.py           AnalysisRequest/Response, EvidenceRegion, ExecutionStage…
  services/
    image_ingestion.py    raster → Image row + footprint
    raster_metadata.py    rasterio metadata, CRS normalisation, footprint reprojection
    raster_storage.py     local filesystem store for uploaded rasters
    query_intent.py       natural-language query → analytical focus (keyword rules)
    perception_model.py   process-wide lazy Prithvi singleton
    scene_analysis.py     the five-stage analysis orchestration
    scene_preview.py      true-colour PNG of the analysed tile
  geospatial/
    footprint.py          bounds → shapely polygon
    regions.py            label grid → connected components → measured regions
migrations/               Alembic environment and versions
tests/
```

Layering is one-directional: `api` → `services` → (`geospatial`, `models`,
`satquery_ai`). API modules contain no analysis logic, and the services contain no
HTTP concerns — `scene_analysis` raises `SceneAnalysisError`, which `api/analysis.py`
translates into a `422`.

## API routes

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | liveness probe |
| `POST` | `/projects` | create a project |
| `GET` | `/projects` | list projects, newest first |
| `GET` | `/projects/{project_id}` | fetch one project (`404` if absent) |
| `DELETE` | `/projects/{project_id}` | delete a project and cascade its images |
| `POST` | `/projects/{project_id}/images` | upload a `.tif`/`.tiff`, ingest metadata, store the raster |
| `GET` | `/projects/{project_id}/images` | list a project's images, newest first |
| `GET` | `/images/search?longitude=&latitude=` | images whose footprint contains a WGS84 point |
| `POST` | `/images/{image_id}/analysis` | run a scene analysis |
| `GET` | `/images/{image_id}/preview` | true-colour PNG of the analysed tile |

CORS is enabled for the Vite dev server (`cors_allow_origins`, default
`http://localhost:5173` and `http://127.0.0.1:5173`).

### `POST /images/{image_id}/analysis`

```jsonc
// request
{ "query": "Where is the vegetation?", "region_count": 4 }   // region_count 2–8, default 4
```

The response carries the answer, the evidence and the execution trace, keyed to
match the frontend's domain types:

```jsonc
{
  "runId": "3fcf5b",
  "imageId": "…",
  "query": "Where is the vegetation?",
  "intent": "locate vegetation",
  "elapsed": "0.28 s",
  "scene":  { "id": "…", "sensor": "HLS Sentinel-2", "crs": "EPSG:32613",
              "gsd": "30 m/px", "extent": "6.72 x 6.72 km", "kind": "optical" },
  "answer": [ { "t": "text", "value": "…" },
              { "t": "value", "value": "16.59 km²", "tone": "measured" },
              { "t": "ref",   "value": "R1", "regionId": "R1" } ],
  "confidence": 0.72,
  "confidenceNote": "area-weighted spectral agreement across 8 regions",
  "provenance": ["interpreted", "measured"],
  "regions": [ { "id": "R1", "className": "dense vegetation", "area": "5.76 km²",
                 "perimeter": "18.40 km", "confidence": 0.8,
                 "centroid": "28.7451N 104.7527W", "bands": "B04 B8A · NDVI",
                 "provenance": "measured",
                 "box": { "left": "7.1%", "top": "35.7%",
                          "width": "85.7%", "height": "28.6%" } } ],
  "stages": [ { "name": "query understanding", "state": "done",
                "duration": "0.00 s", "details": [ { "label": "resolver",
                                                     "value": "keyword-rule-v1" } ] } ]
}
```

Returns `422` when the image has no stored raster, the stored file is missing, or
the raster does not have the six bands Prithvi requires. Returns `404` for an
unknown image id.

### Analysis pipeline

`services/scene_analysis.py` runs five stages, times each one, and returns the
trace alongside the result:

| Stage | Implementation |
|---|---|
| query understanding | `services/query_intent.py` — keyword rules, **not** a language model |
| scene interpretation | `satquery_ai` — pretrained Prithvi encoder + k-means |
| geospatial computation | `geospatial/regions.py` — polygonise · area · perimeter · centroid |
| aggregation | filter regions by intent, area-weighted confidence |
| answer synthesis | template over measured values only |

Region ids are assigned **after** the intent filter, so `R1` is always the largest
region that actually matches the question. When nothing matches, the response says
so and reports the tile-wide fraction of the requested land cover rather than
returning an empty result silently.

Confidence is the area-weighted mean of each region's *label agreement* — the
share of its pixels satisfying its assigned land-cover label. It is measured, not
asserted.

## Database and geospatial

Two tables, three migrations:

- **`projects`** — `id` (UUID, `gen_random_uuid()`), name, description, timestamps.
- **`images`** — project FK (cascade delete), filename, `storage_key`, mime type,
  file size, raster metadata (width, height, band count, dtype, CRS, bounds),
  `acquisition_time`, `status`, timestamps, and a spatially-indexed
  `footprint Geometry(POLYGON, 4326)`.

`services/raster_metadata.py` normalises the raster CRS to an `EPSG:<code>` string
and **reprojects the bounds to EPSG:4326** before building the footprint, so
spatial queries against projected scenes (the HLS demo scenes are UTM 13N) are
correct. `services/spatial.py` uses `ST_Contains` for point-in-footprint search.

`geospatial/regions.py` is where pixels become geography: it splits each AI region
label into connected components (`scipy.ndimage.label`), discards components below
a minimum pixel count, polygonises each with `rasterio.features.shapes` under the
raster's transform, and measures area and perimeter in CRS units, reprojecting
centroids to WGS84 with pyproj.

### Raster storage

Analysis needs the pixels long after the upload request ends, so uploaded files are
copied to `raster_storage_dir` (default `backend/storage/rasters`, gitignored) and
referenced by `Image.storage_key`. `services/raster_storage.py` is the single seam;
MinIO is the intended production replacement.

## AI/ML integration boundary

`backend/.venv` contains both FastAPI and the AI/ML stack, plus an editable install
of `aiml/src/satquery_ai`, so the model is imported in-process — no model server,
no serialisation.

```python
from satquery_ai.perception.region_segmentation import PrithviRegionSegmenter
```

- The backend calls exactly one entry point: `PrithviRegionSegmenter.segment()`.
- It receives a **pixel-space** label grid plus per-region spectral evidence, and
  does all geographic work itself.
- `services/perception_model.py` holds one thread-safe lazy singleton per process.
  The first request pays roughly fifteen seconds (mostly the terratorch import);
  later runs are well under a second on GPU.
- The backend never touches `PrithviPerception` / `PrithviModel.predict()`, because
  that path's segmentation head is untrained — see `aiml/README.md`.

## Setup

```bash
cp .env.example .env      # then fill in DATABASE_URL and TEST_DATABASE_URL
```

| Setting | Meaning |
|---|---|
| `DATABASE_URL` | e.g. `postgresql+psycopg://user:pass@localhost:5432/satquery_ai` |
| `TEST_DATABASE_URL` | a separate database; the test suite truncates it |
| `RASTER_STORAGE_DIR` | optional; defaults to `backend/storage/rasters` |
| `CORS_ALLOW_ORIGINS` | optional JSON list; defaults to the Vite dev server |

Both databases need the PostGIS extension:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

## Migrations

Run from the **repository root** — `migrations/env.py` imports `backend.app.*`, so
the repo root must be on `sys.path`:

```bash
backend/.venv/Scripts/python.exe -m alembic -c backend/alembic.ini upgrade head
backend/.venv/Scripts/python.exe -m alembic -c backend/alembic.ini current
backend/.venv/Scripts/python.exe -m alembic -c backend/alembic.ini revision --autogenerate -m "message"
```

`env.py` reads `DATABASE_URL` from settings, overridable with the
`ALEMBIC_DATABASE_URL` environment variable — useful for migrating the test
database.

## Running

```bash
backend/.venv/Scripts/python.exe -m uvicorn backend.app.main:app --reload
```

Interactive API docs at `http://localhost:8000/docs`.

## Testing

```bash
backend/.venv/Scripts/python.exe -m pytest backend/tests -q     # from the repo root
```

51 tests. They run against `TEST_DATABASE_URL` — the `client` fixture truncates
`images` and `projects` before each API test, so point it at a throwaway database.

Tests that need a real six-band scene are marked `requires_hls_scene` and skip
themselves when `aiml/data/raw/Mexico_HLS.S30.T13REM.2018026T173609.v2.0_cropped.tif`
is absent (see `aiml/README.md` for how to fetch it). The remaining tests, including
the geospatial measurement tests, build their own synthetic rasters via `tmp_path`.

## Implementation status

**Working**
- Project CRUD, GeoTIFF upload with raster metadata ingestion and local storage
- Footprint extraction with CRS reprojection, PostGIS point-containment search
- Scene analysis endpoint end to end: query → Prithvi → measured evidence → trace
- True-colour preview of the analysed tile
- CORS for the Vite dev server

**Not done**
- No authentication or authorisation whatsoever
- No object storage (local filesystem only), no async job queue — analysis is
  synchronous, which is viable only because a warm run is sub-second
- No analysis persistence: runs are computed and returned, never stored, so there
  is no run history endpoint
- Only the top-left 224×224 window of a raster is analysed
- Single-scene only — no bi-temporal or SAR/optical endpoints
- No structured logging, rate limiting, or pagination
