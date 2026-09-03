import type { CapabilityRow, TechItem } from './types';

/** Technology marquee (wireframe 1a). Auto-scrolls; hover/focus reveals name + info. */
export const TECH_ITEMS: TechItem[] = [
  { icon: 'cpu', name: 'vision-language model', info: 'scene VQA + grounding' },
  { icon: 'layers', name: 'segmentation models', info: 'Prithvi-EO V2 · flood, cropland' },
  { icon: 'activity', name: 'SAR backscatter models', info: 'speckle filter · VV/VH' },
  { icon: 'list', name: 'tool-calling agent', info: 'plan · execute · verify' },
  { icon: 'crosshair', name: 'PostGIS', info: 'ST_Intersection · ST_Area' },
  { icon: 'image', name: 'Sentinel-1 / Sentinel-2', info: 'SAR + optical · 10 m/px' },
  { icon: 'search', name: 'STAC API', info: 'scene search · COG assets' },
  { icon: 'download', name: 'GDAL / rasterio', info: 'raster IO · warping' },
  { icon: 'map-pin', name: 'PROJ / EPSG', info: 'CRS transforms' },
  { icon: 'expand', name: 'xarray + dask', info: 'tiled band algebra' },
  { icon: 'upload', name: 'FastAPI + task queue', info: 'run lifecycle · stages' },
  { icon: 'clock', name: 'OpenTelemetry traces', info: 'per-stage spans · run.json' },
];

/** Capability index (wireframe 1a / landing). "built" vs "roadmap" is load-bearing:
 *  DESIGN.md requires SAR + change detection to appear as roadmap surfaces only. */
export const CAPABILITIES: CapabilityRow[] = [
  {
    capability: 'Visual question answering',
    what: 'Answers a question about one scene, with the region it read.',
    producedBy: 'interpreted',
    state: 'built',
  },
  {
    capability: 'Spatial grounding',
    what: 'Outlines the pixels the answer rests on, per region.',
    producedBy: 'interpreted',
    state: 'built',
  },
  {
    capability: 'Geospatial computation',
    what: 'Areas, perimeters, distances and transects computed, not estimated.',
    producedBy: 'measured',
    state: 'built',
  },
  {
    capability: 'Bi-temporal change detection',
    what: 'Will compare two registered passes and outline differing regions with measured areas.',
    producedBy: 'measured',
    state: 'roadmap',
  },
  {
    capability: 'SAR analysis and fusion',
    what: 'Will read backscatter where cloud obscures the optical pass.',
    producedBy: 'interpreted',
    state: 'roadmap',
  },
  {
    capability: 'Agentic orchestration',
    what: 'Selects and sequences the tools each question requires.',
    producedBy: 'interpreted',
    state: 'built',
  },
  {
    capability: 'Evidence aggregation',
    what: 'Rolls region-level findings into one answer with per-region rows.',
    producedBy: 'measured',
    state: 'built',
  },
  {
    capability: 'Confidence and uncertainty',
    what: 'States a figure and a band per answer and per region.',
    producedBy: 'interpreted',
    state: 'built',
  },
  {
    capability: 'Inspectable execution trace',
    what: 'Every stage with its model, operation, parameters and duration.',
    producedBy: 'measured',
    state: 'built',
  },
];

export const HOW_STEPS = [
  { n: '01', s: 'question', p: "Plain language, in the analyst's own terms.", edge: true },
  { n: '02', s: 'scene', p: 'One pass, or two for change. Optical, SAR or both.' },
  { n: '03', s: 'interpretation', p: 'Vision models read the scene and localise regions.' },
  { n: '04', s: 'planning', p: 'The orchestrator writes the operation chain, and shows it.' },
  { n: '05', s: 'execution', p: 'Models and geospatial operations run in order, timed.' },
  { n: '06', s: 'aggregation', p: 'Regions become measured areas, distances, counts.' },
  { n: '07', s: 'answer', p: 'Answer, confidence, evidence, trace — one surface.', edge: true },
] as const;

export const ANSWER_CARRIES = [
  { k: 'answer', v: '1–3 sentences' },
  { k: 'confidence', v: '0.00–1.00 + band' },
  { k: 'evidence', v: 'regions + crops' },
  { k: 'measurements', v: 'unit + precision' },
  { k: 'provenance', v: 'interpreted / measured' },
  { k: 'trace', v: 'per stage, expandable' },
] as const;
