import type { Scene } from './types';

/** Scene library contents (wireframe 1c). Representative metadata — no imagery
 *  is loaded until a GeoTIFF/COG is dropped in. */
export const SCENES: Scene[] = [
  {
    id: 'S2A_MSIL2A_20240712',
    sensor: 'Sentinel-2A',
    pass: '2024-07-12 10:41Z',
    crs: 'EPSG:32631',
    gsd: '10 m/px',
    cloud: '4% cloud',
    extent: '24.0 × 18.5 km',
    kind: 'optical',
  },
  {
    id: 'S1A_IW_GRDH_20240711',
    sensor: 'Sentinel-1A',
    pass: '2024-07-11 18:02Z',
    crs: 'EPSG:32631',
    gsd: '10 m/px',
    polarisation: 'VV+VH',
    extent: '24.0 × 18.5 km',
    kind: 'sar',
  },
  {
    id: 'S2A_MSIL2A_20190803',
    sensor: 'Sentinel-2A',
    pass: '2019-08-03 10:38Z',
    crs: 'EPSG:32631',
    gsd: '10 m/px',
    cloud: '1% cloud',
    extent: '24.0 × 18.5 km',
    kind: 'optical',
  },
];

export const DEFAULT_SCENE = SCENES[0]!;

export function getScene(id: string | null | undefined): Scene {
  return SCENES.find((s) => s.id === id) ?? DEFAULT_SCENE;
}
