# SatQuery AI

SIH 2026 · problem statement **SIH26167** (ISRO) — an interactive vision-language
assistant for multimodal remote-sensing image analysis through text queries.

A user asks a natural-language question about satellite imagery; the system decides
*how* to analyse it, runs specialist remote-sensing models plus deterministic
geospatial tools, and returns an **answer + spatial evidence + confidence +
auditable execution trace**.

Guiding principle: **AI interprets; deterministic software calculates.**
Areas, coordinates, CRS transforms and geometry are computed with rasterio /
shapely / pyproj / PostGIS — never produced by a model.

Full product target: `C:\Users\Gautam\Downloads\SatQueryAI_PROJECT_TARGET.md`.

## Layout

| Directory | Responsibility |
|---|---|
| `aiml/` | `satquery_ai` package — scene loading, Prithvi preprocessing, model wrappers, perception/evidence |
| `backend/` | FastAPI app, SQLAlchemy models, Alembic migrations, raster ingestion, PostGIS spatial queries |
| `frontend/` | React 18 + TS + Vite + Tailwind v4 workspace UI ("Groundtruth" design system) |

## Environments

There is **one working Python environment: `backend/.venv`** (Python 3.13). It
contains FastAPI *and* the full AI/ML stack (torch 2.13.0+cu126, terratorch 1.2.11,
timm, torchgeo, rasterio) *and* an editable install of `aiml/src/satquery_ai`.
So the backend can import and invoke the AI/ML package in-process.

`aiml/.venv` exists but is **empty** — do not use it.

```bash
backend/.venv/Scripts/python.exe -m pytest backend/tests -q   # 51 pass
cd aiml && ../backend/.venv/Scripts/python.exe -m pytest tests -q   # 19 pass
cd frontend && npm ci && npm test                             # 34 pass
cd frontend && npm run dev                                    # vite :5173
backend/.venv/Scripts/python.exe -m uvicorn backend.app.main:app --reload
```

`frontend/src/test/live-backend.e2e.test.tsx` runs the React workspace against a
**running** backend with nothing stubbed; it skips itself when the backend is
unreachable, so `npm test` stays offline-safe.

Postgres + PostGIS runs on localhost:5432 (`satquery_ai`, `satquery_ai_test`);
credentials in `backend/.env` (gitignored, `.env.example` is the template).
Prithvi weights are already in the local HuggingFace cache
(`ibm-nasa-geospatial/Prithvi-EO-2.0-tiny-TL`).

## Implementation state

One vertical slice is live end to end: **ask a question about a scene → Prithvi
runs → measured regions render in the workspace.**

**AI/ML** — the **encoder is pretrained; the FCNDecoder head is randomly
initialised** (two builds disagree on ~50% of pixels for the same input), so
`PrithviPerception.analyze()` class labels and confidence are **meaningless** and
nothing user-facing may use them. `PrithviRegionSegmenter`
(`perception/region_segmentation.py`) uses only the trustworthy part: it clusters
the encoder's patch embeddings — averaged across all 12 layers, which measurably
beats any single layer on spatial coherence and land-cover separation — into
regions, then labels each one from NDWI/NDVI/NDBI thresholds
(`perception/spectral.py`). Labels are therefore *measured*, and region confidence
is the share of a region's pixels that satisfy its label.

**Backend** — projects CRUD, GeoTIFF upload with local raster storage, footprint
extraction (reprojected to 4326), PostGIS search, `POST /images/{id}/analysis`
and `GET /images/{id}/preview`. `services/scene_analysis.py` orchestrates five
timed stages and returns a truthful execution trace. Model held in a lazy
process singleton — first request ~15 s, later runs well under 1 s.

**Frontend** — `/workspace` is live against the backend (`lib/api.ts`,
`hooks/useLiveScenes.ts`, `hooks/useAnalysisRun.ts`, `LiveScenePanel`). The
authored runs in `src/data/runs.ts` still drive `?run=` deep links and the
no-live-scene fallback; every other page remains a prototype surface.

**Still missing:** bi-temporal change detection, SAR/optical fusion, a fine-tuned
head, object storage, async jobs, auth.

## Constraints

- `aiml/data/` is gitignored and **absent locally** — three `aiml` tests fail with
  `FileNotFoundError` on `Mexico_HLS...tif`. Not a code defect.
- Prithvi preprocessing requires exactly **6 bands, ≥224×224** (HLS/Sentinel-2
  B02 B03 B04 B8A B11 B12). `backend/tests/fixtures/sample_satellite.tif` is a
  10×10 3-band synthetic and cannot feed Prithvi.
- The demo scenes are two HLS tiles of the same area of Chihuahua, Mexico
  (January and July 2018), fetched from `ibm-nasa-geospatial/Prithvi-EO-2.0-300M`.
  They separate seasonally — vegetation covers ~2% of the January tile and ~37%
  of the July one — which is the strongest thing to show on stage.
- Only the top-left 224×224 window of a raster is analysed; the preview endpoint
  renders exactly that window so the evidence boxes line up.

## Rules

- **Never** fabricate AI output, confidence values or evidence to make the UI look
  complete. The prototype is explicitly honest about what is mocked; keep it that way.
- Do not run `git commit` or `git push` — the user commits. Prepare milestones,
  show the diff, recommend a message, then wait.
- Never run destructive git commands (`clean`, `reset --hard`, `checkout -- .`,
  `stash drop`). Two stashes are intentionally preserved.
- Commit style: `feat(scope): …`, `fix(scope): …`, `chore: …`, `merge: …`.

## Demo

```bash
backend/.venv/Scripts/python.exe -m uvicorn backend.app.main:app   # :8000
cd frontend && npm run dev                                         # :5173
```

Open `/workspace`, load a 6-band HLS GeoTIFF with **Load GeoTIFF**, then ask
"Where is the vegetation?" — switching between the January and July scenes shows
the seasonal difference. Uploaded scenes persist under `backend/storage/rasters/`.

## Next milestone

Fine-tune a real segmentation head so land-cover labels come from the model rather
than spectral thresholds; it drops in behind the same endpoint and the same UI.
