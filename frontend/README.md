# SatQuery AI — web

React + TypeScript + Tailwind implementation of the Groundtruth design system
(`../DESIGN.md`) and the SatQuery AI wireframes (`../SatQuery Wireframes.dc.html`,
screens 1a–1m). Migrated from the static `../` prototype — that folder is left in
place as reference.

```bash
npm install
npm run dev        # vite dev server on :5173
npm run build      # tsc -b && vite build  →  dist/
npm run preview    # serve the production build
npm run typecheck  # tsc -b --noEmit
npm run lint       # eslint (flat config)
npm test           # vitest run
npm run format     # prettier --write
```

## Stack

| Concern | Choice |
|---|---|
| Build | Vite 6 |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`) |
| UI | React 18 |
| Routing | react-router 6 — SPA, deep links preserved (`?run=` `?q=` `?scene=` `?export=1`) |
| Styling | Tailwind v4, theme mapped onto the Groundtruth CSS-variable tokens |
| Fonts | `@fontsource` — Archivo + IBM Plex Mono, self-hosted at build (satisfies DESIGN.md "no font CDN") |
| Tests | Vitest + Testing Library (jsdom) |

## Structure

```
src/
  styles/tokens.css      Groundtruth tokens — :root (dark workspace, canonical)
                         + .gt-landing (light) + .gt-dark (dark island in the landing)
  styles/index.css       Tailwind entry, @theme mapping, base layer, type-scale
                         utilities (display / headline-* / body-* / label-caps / data-*),
                         keyframes, reduced-motion
  data/                  typed mock data — scenes, runs (with per-stage detail),
                         classifyQuery() routing, landing tables
  hooks/                 useLayoutMode (shell / stacked / column per DESIGN.md
                         breakpoints), useReducedMotion, useRunPipeline (the
                         staged-execution state machine)
  components/ui/         20 DS primitives ported from _ds_bundle.js → TSX:
                         Button · Icon · RegistrationMark/Brackets · StatusDot ·
                         Divider · Panel · Callout · Tooltip · MetaValue ·
                         DataTable · ConfidenceMeter · ProvenanceChip/ChangeBadge ·
                         ExecutionStage/Trace · QueryInput · TextInput ·
                         AnswerBlock · Overlay (focus-trapped transient surface)
  components/workspace/  WorkspaceShell · NavRail · PageShell · ContextColumn ·
                         ImageryCanvas · CanvasRegion · EvidenceColumn ·
                         EvidenceInspector · ExportPanel
  components/landing/    LandingChrome · LandingSections · AnalysisArtifact ·
                         TechMarquee (the auto-scrolling technology strip)
  pages/                 LandingPage 1a · AuthPage 1b · SceneLibraryPage 1c ·
                         WorkspacePage 1d/1e/1f/1g/1j/1k · RunHistoryPage 1i ·
                         ComparePage 1h · NotFoundPage
  test/                  pipeline logic, DS components, every route renders
```

## Screen ↔ route

| Wireframe | Route | Notes |
|---|---|---|
| 1a landing / 1m flow | `/` | light `.gt-landing`; hero artifact is the real workspace components in `.gt-dark` |
| 1b sign in + workspace pick | `/signin` | mock form, no backend, nothing submitted |
| 1c scene library | `/library` | scene select updates the detail bar + sidebar |
| 1d–1k workspace | `/workspace` | one page; `useRunPipeline` + query params drive empty / running / answer / low-confidence / failure / inspector / export |
| 1i run history | `/history` | select a row → Reopen (`?run=`) · Compare · Export (`?run=…&export=1`) |
| 1h change detection + SAR fusion | `/compare` | opens with a ROADMAP callout — figures representative, not a live run |

## Prototype honesty

All analysis data is mocked (`src/data/runs.ts`). Bi-temporal change detection and
SAR/optical fusion appear **only** as roadmap surfaces (DESIGN.md). Rail pages
carry a vertical `PROTOTYPE` marker; the landing says so in its footer; the bare
auth screen carries a fixed note. A question mentioning *shoreline / change*
routes to `/compare`; *parcels / drained* takes the halted-chain failure path
(run `0f3a12`); *structures* completes at low confidence (run `0f3a44`).

## Known follow-ups

- `npm audit` reports dev-only advisories (esbuild dev-server CORS, a react-router
  advisory) that are transitive and not fixable without breaking-change bumps —
  left as-is for a prototype foundation.
- `@fontsource` pulls every Unicode subset; a production build should import only
  `latin` / `latin-ext`.
- The `<image-slot>` drop target is a lightweight React equivalent — no
  cross-reload persistence (that was an omelette-runtime feature).
