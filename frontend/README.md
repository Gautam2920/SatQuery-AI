# SatQuery AI — web

The React workspace. Implements the "Groundtruth" design system and the SatQuery AI
wireframes (screens 1a–1m), and drives the live analysis backend.

## Purpose

Let an analyst load a satellite scene, ask a question in plain language, and read
the result **with its evidence** — grounded regions on the imagery, measured areas
and coordinates, a confidence figure, and an inspectable trace of every stage that
ran.

The frontend computes nothing. Every value it renders comes from the backend, and
when a request fails it says so rather than substituting placeholder data.

## Tech stack

| Concern | Choice |
|---|---|
| Build | Vite 6 |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`) |
| UI | React 18 |
| Routing | react-router 6 — SPA, deep links preserved (`?run=` `?q=` `?scene=` `?export=1`) |
| Styling | Tailwind v4, theme mapped onto the Groundtruth CSS-variable tokens |
| Fonts | `@fontsource` — Archivo + IBM Plex Mono, self-hosted at build (no font CDN) |
| HTTP | native `fetch`, wrapped in `src/lib/api.ts` |
| Tests | Vitest + Testing Library + user-event (jsdom) |

## Architecture

```
src/
  lib/
    api.ts               backend client — every request/response type, no fallbacks
    cn.ts                class-name helper
  hooks/
    useLiveScenes.ts     backend connection, scene discovery, GeoTIFF upload
    useAnalysisRun.ts    live run state — calls the analysis endpoint
    useRunPipeline.ts    authored-run state machine (deep links / no-scene fallback)
    useLayoutMode.ts     shell / stacked / column breakpoints
    useReducedMotion.ts  prefers-reduced-motion
  data/
    types.ts             domain types — Run, EvidenceRegion, ExecutionStageData, AnswerToken
    runs.ts              authored runs, classifyQuery(), stage names and detail
    scenes.ts            authored scene library entries
    landing.ts           landing-page tables and copy
  components/
    ui/                  20 design-system primitives
    workspace/           the analysis surface
    landing/             landing-page sections
    common/              ImageSlot, PrototypeBadge
  pages/                 one component per route
  styles/
    tokens.css           Groundtruth tokens — :root (dark workspace, canonical)
                         + .gt-landing (light) + .gt-dark (dark island in the landing)
    index.css            Tailwind entry, @theme mapping, type-scale utilities, keyframes
  test/
```

`src/data/types.ts` is the contract: the backend's analysis response is shaped to
satisfy those types, so the same components render authored and live runs without
branching.

## Pages

| Wireframe | Route | Notes |
|---|---|---|
| 1a landing / 1m flow | `/` | light `.gt-landing`; hero artifact is the real workspace components in `.gt-dark` |
| 1b sign in | `/signin` | mock form, no backend, nothing submitted |
| 1c scene library | `/library` | authored scene list; selection updates the detail bar |
| 1d–1k workspace | `/workspace` | **live**; one page covering empty / running / answer / inspector / export / failure |
| 1i run history | `/history` | authored runs → Reopen (`?run=`) · Compare · Export |
| 1h change detection + SAR fusion | `/compare` | opens with a ROADMAP callout — not a live run |

### Workspace components

`WorkspaceShell` lays out three columns:

- **`ContextColumn`** — query input, plan, layer toggles, and the scene block.
  When a `scenePanel` is supplied it renders that instead of authored metadata.
- **`LiveScenePanel`** — backend connection status, loaded scenes, scene switching,
  GeoTIFF upload, and scene-level errors.
- **`ImageryCanvas`** — instrument chrome (bands, CRS, coordinates), the imagery,
  and `CanvasRegion` brackets for each grounded region. With a `previewUrl` it
  shows the backend's render of the analysed tile; otherwise the `ImageSlot`
  placeholder. Region boxes are percentage offsets of that same tile, so they align.
- **`EvidenceColumn`** — answer prose, confidence meter, evidence table, evidence
  crops, and the `ExecutionTrace`.
- **`EvidenceInspector`** / **`ExportPanel`** — transient focus-trapped overlays.

Region outlines are drawn as registration brackets, never filled shapes — the UI
must not imply a pixel-accurate mask it does not have.

### Design-system primitives (`components/ui/`)

Button · Icon · RegistrationMark/Brackets · StatusDot · Divider · Panel · Callout ·
Tooltip · MetaValue · DataTable · ConfidenceMeter · ProvenanceChip/ChangeBadge ·
ExecutionStage/Trace · QueryInput · TextInput · AnswerBlock · Overlay.

`AnswerBlock` renders answers from typed tokens (`text` / `value` / `ref`) rather
than HTML strings, so numeric values get Plex Mono and evidence references stay
clickable.

## API integration

All backend access goes through `src/lib/api.ts`. Base URL comes from
`VITE_API_URL` (default `http://localhost:8000`).

| Function | Endpoint |
|---|---|
| `listProjects` / `createProject` / `ensureWorkspaceProject` | `/projects` |
| `listProjectImages` | `GET /projects/{id}/images` |
| `uploadScene` | `POST /projects/{id}/images` |
| `runAnalysis` | `POST /images/{id}/analysis` |
| `scenePreviewUrl` | `GET /images/{id}/preview` |

The client throws `ApiError` with the backend's `detail` message on failure and
supplies **no** default values, so a failure can never be mistaken for a result.

Flow: `useLiveScenes` finds or creates the `SatQuery workspace` project on mount,
lists its images and keeps only those with six bands and a stored raster.
`useAnalysisRun` calls the analysis endpoint and maps the response into the shared
`Run` type; a failure becomes a failed `Run` carrying the real error, which renders
in the existing "Run halted" surface.

While a request is in flight the execution trace shows every stage as **pending** —
the frontend never invents progress it cannot observe. Real stages with measured
durations replace it when the response lands.

## Development

```bash
npm ci
cp .env.example .env      # VITE_API_URL, defaults to http://localhost:8000

npm run dev        # vite dev server on :5173
npm run build      # tsc -b && vite build  →  dist/
npm run preview    # serve the production build
npm run typecheck  # tsc -b --noEmit
npm run lint       # eslint (flat config)
npm run format     # prettier --write
```

The workspace needs the backend running (`uvicorn backend.app.main:app`) and at
least one 6-band HLS GeoTIFF loaded — see the root README.

## Testing

```bash
npm test           # vitest run
npm run test:watch
```

34 tests across five files:

| File | Covers |
|---|---|
| `pipeline.test.ts` | `classifyQuery` routing, confidence banding, authored-run integrity |
| `components.test.tsx` | design-system primitives |
| `pages.render.test.tsx` | every route renders; workspace deep links |
| `live-workspace.test.tsx` | live mode against a stubbed `fetch` — connection, preview, evidence rendering, region placement, backend failure, unusable image, API client errors |
| `live-backend.e2e.test.tsx` | the real app against a **running** backend, nothing stubbed; skips itself when unreachable |

## Implementation status

**Live** — `/workspace` runs against the backend: scene upload and selection,
query submission, real evidence rendering, region overlays on the analysed tile,
inspectable execution trace, and honest loading/empty/error states.

**Still authored** — everything else. `src/data/runs.ts` supplies the run history,
the compare page, the scene library and the landing artifact, and drives
`/workspace` itself when no live scene is loaded (a question mentioning
*shoreline / change* routes to `/compare`; *parcels / drained* takes the
halted-chain failure path, run `0f3a12`; *structures* completes at low confidence,
run `0f3a44`). Bi-temporal change detection and SAR/optical fusion appear **only**
as roadmap surfaces. Rail pages carry a vertical `PROTOTYPE` marker, the landing
says so in its footer, and the auth screen carries a fixed note.

**Not built** — no authentication (the sign-in form submits nothing), no run
persistence or history from the backend, no real export (the export panel is a
prototype surface), no scene-library integration with stored images.

**Known follow-ups**
- `npm audit` reports dev-only advisories (esbuild dev-server CORS, a react-router
  advisory) that are transitive and not fixable without breaking-change bumps.
- `@fontsource` pulls every Unicode subset; a production build should import only
  `latin` / `latin-ext`.
- The `<image-slot>` drop target has no cross-reload persistence.
