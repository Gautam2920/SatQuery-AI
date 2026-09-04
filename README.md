# SatQuery AI

**Smart India Hackathon 2026 · SIH26167 · Indian Space Research Organisation**

> An interactive vision-language assistant for multimodal remote-sensing image
> analysis through text queries.

Ask a natural-language question about satellite imagery and get back an **answer,
the spatial evidence behind it, a confidence figure, and an auditable record of
what actually ran** — without needing to know which model, sensor or GIS operation
the question requires.

## The problem

Remote-sensing AI arrives as isolated, task-specific tools: one model for VQA,
another for change detection, another for segmentation, each with its own inputs
and preprocessing. To get an answer out of a satellite scene today, an analyst
needs to understand sensors, band combinations, coordinate reference systems, file
formats and model selection *before* they can ask their actual question.

SatQuery AI moves that complexity into the system. The user says **what they want
to know**; the system decides **how it should be analysed**.

## Scope and goals

The SIH problem statement calls for an agentic vision-language system covering
single-image analysis (VQA plus grounding or captioning), bi-temporal change
analysis, cross-modal optical/SAR analysis, query-driven workflow orchestration,
evidence-grounded and confidence-annotated responses, and at least one component
adapted to remote-sensing data.

This repository currently implements **one complete vertical slice** of that
target: query-driven single-scene region analysis, running end to end across all
three layers. The remaining capabilities are not built — see
[Current limitations](#current-limitations).

### Governing principle

> **AI interprets; deterministic software calculates.**

A model decides which pixels belong together. Every number the user sees — area,
perimeter, coordinates, confidence — is computed by deterministic code from the
raster's own transform and CRS. This is a reliability decision: it is what keeps
the system from inventing plausible-sounding measurements.

A direct consequence: the Prithvi checkpoint the project uses has a **pretrained
backbone but a randomly initialised segmentation head**, so its class predictions
are meaningless. Rather than present them anyway, the pipeline uses only the
pretrained encoder and derives land-cover labels from published spectral index
thresholds. Nothing in the UI is fabricated to look complete.

## Architecture

```
                    React workspace  (Vite · :5173)
                            │  POST /images/{id}/analysis
                            ▼
                    FastAPI  (Uvicorn · :8000)
                            │
              ┌─────────────┼──────────────────┐
              ▼             ▼                  ▼
      query intent   satquery_ai        geospatial layer
      keyword rules  Prithvi encoder    rasterio · shapely · pyproj
                     + k-means          polygons · area · centroids
              └─────────────┼──────────────────┘
                            ▼
              answer + evidence + confidence + execution trace
                            │
                            ▼
                 PostgreSQL + PostGIS   (metadata, footprints)
                 local raster store     (pixels, for re-analysis)
```

A single analysis request flows through five timed stages, and the trace of what
ran is returned to the user alongside the result:

```
query understanding → scene interpretation → geospatial computation
                    → aggregation → answer synthesis
```

### How the three layers relate

| Layer | Owns | Explicitly does *not* own |
|---|---|---|
| **`aiml/`** | Raster loading, Prithvi preprocessing and inference, region segmentation, spectral evidence — all in **pixel space** | Anything geographic; any HTTP concern |
| **`backend/`** | REST API, persistence, raster storage, **all** CRS/geometry/measurement, orchestration and the execution trace | Model internals |
| **`frontend/`** | Query entry, imagery canvas, evidence rendering, execution trace UI | Any analysis logic; it computes no values of its own |

The backend imports `satquery_ai` **in-process** — one Python environment, no model
server, no serialisation boundary. The model is held in a lazy per-process
singleton because constructing it costs ~15 s; warm analyses run in well under a
second.

The frontend never falls back to invented data: if the backend is unreachable or a
request fails, it says so.

## Repository structure

```
aiml/        satquery_ai package — models, preprocessing, perception   → aiml/README.md
backend/     FastAPI app, SQLAlchemy models, Alembic migrations        → backend/README.md
frontend/    React + TypeScript + Tailwind workspace                   → frontend/README.md
CLAUDE.md    working context for AI coding sessions
```

Each directory has its own README with the detail for that layer.

## Setup

**Prerequisites** — Python 3.13, Node 20+, PostgreSQL with PostGIS, and (optional
but much faster) a CUDA GPU. Development to date has used an RTX 3050 6 GB.

### 1. Python environment

`backend/.venv` is the project's **single** Python environment: it carries FastAPI,
the AI/ML stack (torch, terratorch, timm, torchgeo, rasterio) and an editable
install of `aiml/src/satquery_ai`. (`aiml/.venv` exists but is empty — ignore it.)

```bash
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
backend/.venv/Scripts/python.exe -m pip install -e aiml
```

### 2. Database

```sql
CREATE DATABASE satquery_ai;
CREATE DATABASE satquery_ai_test;
-- in each:
CREATE EXTENSION IF NOT EXISTS postgis;
```

```bash
cp backend/.env.example backend/.env      # fill in DATABASE_URL and TEST_DATABASE_URL
backend/.venv/Scripts/python.exe -m alembic -c backend/alembic.ini upgrade head
```

### 3. Demo imagery

`aiml/data/` is gitignored. Fetch the two public Prithvi example scenes — the same
area of Chihuahua, Mexico in January and July 2018:

```bash
cd aiml && ../backend/.venv/Scripts/python.exe -c "
from huggingface_hub import hf_hub_download
import shutil, pathlib
pathlib.Path('data/raw').mkdir(parents=True, exist_ok=True)
for n in ['Mexico_HLS.S30.T13REM.2018026T173609.v2.0_cropped.tif',
          'Mexico_HLS.S30.T13REM.2018201T172901.v2.0_cropped.tif']:
    shutil.copy(hf_hub_download('ibm-nasa-geospatial/Prithvi-EO-2.0-300M', f'examples/{n}'),
                f'data/raw/{n}')
"
```

Prithvi model weights download to the HuggingFace cache automatically on first use.

### 4. Frontend

```bash
cd frontend && npm ci
cp .env.example .env      # VITE_API_URL, defaults to http://localhost:8000
```

## Running

```bash
# terminal 1
backend/.venv/Scripts/python.exe -m uvicorn backend.app.main:app --reload   # :8000

# terminal 2
cd frontend && npm run dev                                                  # :5173
```

Open `http://localhost:5173/workspace`, click **Load GeoTIFF** and pick one of the
Mexico scenes, then ask *"Where is the vegetation?"*.

Switching between the January and July scenes shows the seasonal contrast the
pipeline recovers on its own: vegetation covers roughly **2%** of the January tile
and **37%** of the July one, from the same ground.

### Tests

```bash
cd aiml && ../backend/.venv/Scripts/python.exe -m pytest tests -q    # 19
backend/.venv/Scripts/python.exe -m pytest backend/tests -q         # 51
cd frontend && npm test                                             # 34
```

`frontend/src/test/live-backend.e2e.test.tsx` renders the real React workspace
against a **running** backend with nothing stubbed. It skips itself when the
backend is unreachable, so `npm test` stays offline-safe.

## Current working functionality

**End to end** — load a 6-band HLS GeoTIFF in the workspace, ask a question, and
the query reaches FastAPI, the pretrained Prithvi encoder runs on GPU, its patch
embeddings are clustered into regions, each region is labelled from NDWI/NDVI/NDBI
and measured against the raster CRS, and the answer, evidence table, region
overlays, confidence meter and five-stage execution trace render from that
response. A warm run takes well under a second.

**By layer**

- *AI/ML* — scene loading, Prithvi preprocessing with band/size validation, model
  build and inference on CUDA, pretrained-encoder patch embeddings, region
  segmentation with deterministic spectral labelling.
- *Backend* — project CRUD, GeoTIFF upload with metadata ingestion and raster
  storage, footprint extraction reprojected to EPSG:4326, PostGIS point search,
  the analysis endpoint, and a true-colour preview of the analysed tile.
- *Frontend* — the live workspace, scene upload and selection, imagery canvas with
  grounded region brackets, evidence table, inspectable execution trace, plus
  honest loading, empty and error states.

## Current limitations

**The model is not yet adapted.** The Prithvi segmentation head is untrained, so
land-cover labels come from spectral thresholds rather than a learned classifier.
Fine-tuning one is the single largest gap against the SIH requirement, and the
clearest next step — it drops in behind the same endpoint and the same UI.

**Scope of analysis.** Only the top-left 224×224 window of a raster is analysed
(6.72 × 6.72 km at 30 m/px); there is no tiling over full scenes. Analysis is
single-scene only — **bi-temporal change detection and optical/SAR fusion are not
implemented**, and appear in the UI only as clearly-labelled roadmap surfaces.

**No language model.** Query understanding is keyword rule matching and answers are
templated over measured values. There is no VQA or captioning capability yet.

**Product surface.** No authentication. No object storage (rasters sit on the local
filesystem). No async job queue — analysis is synchronous. Analysis runs are
computed and returned but never persisted, so the run-history and compare pages
still render authored prototype data, as does the scene library. Those pages carry
`PROTOTYPE` markers.

**Environment.** Windows-oriented paths (`backend/.venv/Scripts/...`) throughout;
no Docker setup yet.
