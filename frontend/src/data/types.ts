/* ============================================================================
   Domain types — SatQuery AI

   All analysis data in this app is MOCKED (see PROTOTYPE.md / DESIGN.md
   "prototype honesty"). These types describe the shape a real run WOULD take;
   the values in data/runs.ts are representative, not computed.
   ========================================================================== */

export type Provenance = 'interpreted' | 'measured' | 'change';

/** A GeoJSON geometry in EPSG:4326 as returned by the backend. Present only on
 *  live runs — the authored demo runs carry no real coordinates. */
export interface GeoJsonGeometry {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

export type StageState = 'pending' | 'running' | 'done' | 'failed';

/** One node of the agentic execution trace. Every stage is individually
 *  inspectable — model, operation, parameters, duration. Never one opaque line. */
export interface ExecutionStageData {
  name: string;
  state: StageState;
  duration?: string;
  /** key/value detail lines shown when the stage is expanded */
  details?: { label: string; value: string; tone?: 'default' | 'measured' | 'accent' }[];
  /** free-text diagnostic (failed stages) */
  diagnostic?: string;
  defaultOpen?: boolean;
}

/** A grounded region on the imagery canvas + its measured attributes. */
export interface EvidenceRegion {
  id: string;
  className: string;
  area: string;
  perimeter: string;
  confidence: number;
  centroid: string;
  bands: string;
  provenance: Provenance;
  /** measured outline in EPSG:4326; only live runs have one */
  geometry?: GeoJsonGeometry;
  /** true = flagged low-confidence / needs review (paired with icon + word) */
  alert?: boolean;
  /** placement of the registration-bracket box on the canvas, as CSS % offsets */
  box: {
    left?: string;
    right?: string;
    top?: string;
    bottom?: string;
    width: string;
    height: string;
  };
}

export type RunState = 'complete' | 'refused' | 'failed';

/** Why a run produced no answer. `unsupported` means the question is outside
 *  what this build can do; `insufficient_evidence` means the question was
 *  understood but the scene held nothing to support an answer. */
export type RefusalKind = 'unsupported' | 'insufficient_evidence';

/** A single immutable run. Re-running with edited parameters creates a new run
 *  linked to its parent (not modelled here — prototype scope). */
export interface Run {
  id: string;
  date: string;
  user: string;
  elapsed: string;
  query: string;
  sceneId: string;
  state: RunState;
  /** null when the chain halted before an answer was produced */
  confidence: number | null;
  /** routes to the change-detection surface instead of the single-scene flow */
  kind?: 'change';

  plan?: string;
  /** answer prose as structured tokens (see AnswerBlock) — never raw HTML */
  answer?: AnswerToken[];
  confidenceNote?: string;
  exportSummary?: string;
  provenance?: Provenance[];
  layers?: string[];
  regions?: EvidenceRegion[];
  stages?: ExecutionStageData[];
  /** failure diagnostic shown in the run-halted callout */
  failure?: string;
  /** set when the backend declined to answer; no answer or confidence exists */
  refusal?: string;
  refusalKind?: RefusalKind;
}

/** The answer is prose, not a card. It is composed of typed tokens so numeric
 *  values render in Plex Mono and evidence references stay clickable — never
 *  by injecting HTML strings (the old prototype's approach). */
export type AnswerToken =
  | { t: 'text'; value: string }
  | { t: 'value'; value: string; tone?: 'default' | 'measured' }
  | { t: 'ref'; value: string; regionId: string };

export interface Scene {
  id: string;
  sensor: string;
  pass: string;
  crs: string;
  gsd: string;
  /** measured centre in EPSG:4326; absent when the raster carries no CRS */
  centerLatitude?: number | null;
  centerLongitude?: number | null;
  cloud?: string;
  polarisation?: string;
  extent: string;
  kind: 'optical' | 'sar';
}

export interface CapabilityRow {
  capability: string;
  what: string;
  producedBy: Exclude<Provenance, 'change'>;
  state: 'built' | 'roadmap';
}

export interface TechItem {
  icon: string;
  name: string;
  info: string;
}
