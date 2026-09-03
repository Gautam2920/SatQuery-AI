import type { ExecutionStageData, Run } from './types';

/* ============================================================================
   Mocked runs — the workspace demonstrates single-scene VQA, spatial grounding,
   staged execution and the results surface with representative data. Bi-temporal
   change detection and SAR/optical fusion appear only as roadmap surfaces.
   ========================================================================== */

/** The staged view during a run — 5 stages, per wireframe 1e. */
export const PIPELINE_STAGES = [
  'query understanding',
  'scene interpretation',
  'geospatial computation',
  'aggregation',
  'answer synthesis',
] as const;

export const PIPELINE_DURATIONS: Record<(typeof PIPELINE_STAGES)[number], string> = {
  'query understanding': '0.4 s',
  'scene interpretation': '2.1 s',
  'geospatial computation': '3.6 s',
  aggregation: '1.9 s',
  'answer synthesis': '2.1 s',
};

/** Per-stage inspectable detail — model, operation, parameters (DESIGN.md:
 *  "The audit trail is the product"). */
export const STAGE_DETAIL: Record<string, ExecutionStageData['details']> = {
  'query understanding': [
    { label: 'model', value: 'vlm-orchestrator-1' },
    { label: 'intent', value: 'extent + area' },
  ],
  'scene interpretation': [
    { label: 'model', value: 'prithvi-eo-v2 · flood-seg-v3' },
    { label: 'tiles', value: '48' },
    { label: 'prompt', value: 'water, saturated soil' },
  ],
  'geospatial computation': [
    { label: 'operation', value: 'ST_Transform · ST_Intersection · ST_Area' },
    { label: 'source', value: 'PostGIS 16.2', tone: 'measured' },
    { label: 'crs', value: 'EPSG:32631' },
  ],
  aggregation: [
    { label: 'items', value: '4' },
    { label: 'weighting', value: 'area-weighted mean' },
  ],
  'answer synthesis': [
    { label: 'model', value: 'vlm-orchestrator-1' },
    { label: 'tokens', value: '96' },
  ],
};

const FLOOD_STAGES: ExecutionStageData[] = [
  {
    name: 'query understanding',
    state: 'done',
    duration: '0.4 s',
    details: STAGE_DETAIL['query understanding'],
  },
  {
    name: 'scene interpretation',
    state: 'done',
    duration: '2.1 s',
    details: STAGE_DETAIL['scene interpretation'],
  },
  {
    name: 'geospatial computation',
    state: 'done',
    duration: '6.8 s',
    details: STAGE_DETAIL['geospatial computation'],
  },
  {
    name: 'answer synthesis',
    state: 'done',
    duration: '2.1 s',
    details: STAGE_DETAIL['answer synthesis'],
  },
];

export const RUNS: Run[] = [
  {
    id: '0f3a91',
    date: '2024-07-12',
    user: 'm.reyes',
    elapsed: '11.4 s',
    query: 'Where is the flooded cropland?',
    sceneId: 'S2A_MSIL2A_20240712',
    state: 'complete',
    confidence: 0.82,
    plan: 'Detect inundation from NDWI and SAR backscatter, intersect with the cropland mask, aggregate area per region.',
    confidenceNote: '4 of 4 stages returned within tolerance',
    exportSummary: '12.84 km² inundated cropland',
    provenance: ['interpreted', 'measured'],
    layers: ['true colour', 'inundation mask', 'cropland mask'],
    stages: FLOOD_STAGES,
    answer: [
      { t: 'text', value: 'Flooding covers ' },
      { t: 'value', value: '12.84 km²', tone: 'measured' },
      { t: 'text', value: " of cropland, concentrated along the river's north bank in " },
      { t: 'ref', value: 'R1', regionId: 'R1' },
      { t: 'text', value: ' and ' },
      { t: 'ref', value: 'R2', regionId: 'R2' },
      { t: 'text', value: '. Saturated soil is reported separately at lower confidence.' },
    ],
    regions: [
      {
        id: 'R1',
        className: 'inundated cropland',
        area: '6.21 km²',
        perimeter: '18.4 km',
        confidence: 0.88,
        centroid: '48.8123N 2.0311E',
        bands: 'B03 B08 VV',
        provenance: 'measured',
        box: { left: '14%', top: '24%', width: '22%', height: '20%' },
      },
      {
        id: 'R2',
        className: 'inundated cropland',
        area: '3.90 km²',
        perimeter: '14.7 km',
        confidence: 0.79,
        centroid: '48.8090N 2.0417E',
        bands: 'B03 B08 VV',
        provenance: 'measured',
        box: { right: '20%', top: '50%', width: '17%', height: '16%' },
      },
      {
        id: 'R3',
        className: 'inundated cropland',
        area: '2.73 km²',
        perimeter: '11.2 km',
        confidence: 0.71,
        centroid: '48.8051N 2.0233E',
        bands: 'B03 B08 VV',
        provenance: 'measured',
        box: { left: '10%', bottom: '10%', width: '14%', height: '13%' },
      },
      {
        id: 'R4',
        className: 'saturated soil',
        area: '4.15 km²',
        perimeter: '16.0 km',
        confidence: 0.44,
        centroid: '48.8140N 2.0505E',
        bands: 'B08 VV VH',
        provenance: 'interpreted',
        alert: true,
        box: { right: '12%', bottom: '16%', width: '15%', height: '15%' },
      },
    ],
  },
  {
    id: '0f3a70',
    date: '2024-07-11',
    user: 'm.reyes',
    elapsed: '19.2 s',
    query: 'Has the shoreline retreated since 2019?',
    sceneId: 'A/B pair',
    state: 'complete',
    confidence: 0.76,
    kind: 'change',
  },
  {
    id: '0f3a44',
    date: '2024-07-10',
    user: 'j.okafor',
    elapsed: '8.0 s',
    query: 'How many structures fall inside the extent?',
    sceneId: 'S2A_MSIL2A_20240712',
    state: 'complete',
    confidence: 0.41,
    plan: 'Detect building footprints across the extent, filter by minimum area, count per settlement region.',
    confidenceNote: 'structure detection is below the 10 m/px resolution threshold',
    exportSummary: '≈ 1,240 structures · low confidence',
    provenance: ['interpreted'],
    layers: ['true colour', 'structure footprints'],
    answer: [
      { t: 'text', value: 'About ' },
      { t: 'value', value: '1,240' },
      {
        t: 'text',
        value: ' structures fall inside the scene extent. Rooftop detection is unreliable at ',
      },
      { t: 'value', value: '10 m/px', tone: 'measured' },
      { t: 'text', value: ' and dense settlement in ' },
      { t: 'ref', value: 'R1', regionId: 'R1' },
      { t: 'text', value: ' inflates the count. Reported at low confidence.' },
    ],
    stages: [
      {
        name: 'query understanding',
        state: 'done',
        duration: '0.4 s',
        details: STAGE_DETAIL['query understanding'],
      },
      {
        name: 'scene interpretation',
        state: 'done',
        duration: '3.2 s',
        details: [
          { label: 'model', value: 'prithvi-eo-v2 · building-seg-v1' },
          { label: 'note', value: 'below resolution threshold' },
        ],
      },
      {
        name: 'geospatial computation',
        state: 'done',
        duration: '2.3 s',
        details: STAGE_DETAIL['geospatial computation'],
      },
      {
        name: 'answer synthesis',
        state: 'done',
        duration: '2.1 s',
        details: STAGE_DETAIL['answer synthesis'],
      },
    ],
    regions: [
      {
        id: 'R1',
        className: 'dense settlement',
        area: '2.10 km²',
        perimeter: '9.4 km',
        confidence: 0.38,
        centroid: '48.8102N 2.0388E',
        bands: 'B02 B03 B04',
        provenance: 'interpreted',
        alert: true,
        box: { left: '18%', top: '30%', width: '20%', height: '18%' },
      },
      {
        id: 'R2',
        className: 'scattered structures',
        area: '5.40 km²',
        perimeter: '21.1 km',
        confidence: 0.44,
        centroid: '48.8061N 2.0466E',
        bands: 'B02 B03 B04',
        provenance: 'interpreted',
        alert: true,
        box: { right: '18%', bottom: '22%', width: '17%', height: '17%' },
      },
    ],
  },
  {
    id: '0f3a12',
    date: '2024-07-09',
    user: 'j.okafor',
    elapsed: '2.3 s',
    query: 'Which parcels drained fastest after 09 Jul?',
    sceneId: 'S1A_IW_GRDH_20240711',
    state: 'failed',
    confidence: null,
    plan: 'Reproject the parcel layer, difference the 09 Jul and 12 Jul inundation masks per parcel, rank by drainage rate.',
    failure:
      'ST_Transform to EPSG:32631 returned no overlap with the scene footprint. The chain halted before aggregation; no answer was produced.',
    stages: [
      {
        name: 'query understanding',
        state: 'done',
        duration: '0.4 s',
        details: STAGE_DETAIL['query understanding'],
      },
      {
        name: 'scene interpretation',
        state: 'done',
        duration: '1.9 s',
        details: STAGE_DETAIL['scene interpretation'],
      },
      {
        name: 'geospatial computation',
        state: 'failed',
        duration: '0.1 s',
        defaultOpen: true,
        details: [
          { label: 'operation', value: 'ST_Transform → EPSG:32631' },
          { label: 'result', value: '0 features' },
          { label: 'parcel CRS', value: 'EPSG:2154 (Lambert-93)' },
        ],
        diagnostic:
          'ST_Transform → EPSG:32631\nresult: 0 features\nscene footprint: 24.0 × 18.5 km @ EPSG:32631\nparcel layer CRS: EPSG:2154 (Lambert-93)\ncause: parcel layer never reprojected before the spatial join',
      },
      { name: 'aggregation', state: 'pending' },
    ],
  },
];

export function getRun(id: string | null | undefined): Run | undefined {
  return RUNS.find((r) => r.id === id);
}

export type QueryRoute =
  | { kind: 'change' }
  | { kind: 'failure'; runId: string }
  | { kind: 'low-confidence'; runId: string }
  | { kind: 'answer'; runId: string };

/** Classify a free-text question into one of the demonstrable outcomes.
 *  Mirrors PROTOTYPE.md's documented routing rules. */
export function classifyQuery(raw: string): QueryRoute {
  const q = raw.trim();
  if (/shoreline|retreat|\bchange\b|two passes|since \d{4}/i.test(q)) {
    return { kind: 'change' };
  }
  if (/parcel|drained/i.test(q)) {
    return { kind: 'failure', runId: '0f3a12' };
  }
  if (/structure/i.test(q)) {
    return { kind: 'low-confidence', runId: '0f3a44' };
  }
  return { kind: 'answer', runId: '0f3a91' };
}

export function band(v: number): 'High' | 'Moderate' | 'Low' {
  if (v >= 0.75) return 'High';
  if (v >= 0.5) return 'Moderate';
  return 'Low';
}
