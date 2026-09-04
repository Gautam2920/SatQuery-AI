/* ============================================================================
   SatQuery AI backend client.

   Everything reached through this module is computed server-side by the real
   analysis pipeline (Prithvi encoder + rasterio/shapely measurement). Nothing
   here supplies fallback values — a failed call surfaces as an error so the
   workspace never shows an invented result.
   ========================================================================== */

import type { AnswerToken, EvidenceRegion, ExecutionStageData, Scene } from '@/data/types';

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(
  /\/$/,
  '',
);

/** The demo workspace keeps every uploaded scene under one project. */
export const WORKSPACE_PROJECT_NAME = 'SatQuery workspace';

export interface ProjectSummary {
  id: string;
  name: string;
}

export interface SceneImage {
  id: string;
  filename: string;
  width: number;
  height: number;
  band_count: number;
  crs: string | null;
  storage_key: string | null;
}

export interface AnalysisResult {
  runId: string;
  imageId: string;
  query: string;
  intent: string;
  elapsed: string;
  scene: Scene;
  answer: AnswerToken[];
  confidence: number;
  confidenceNote: string;
  provenance: EvidenceRegion['provenance'][];
  regions: EvidenceRegion[];
  stages: ExecutionStageData[];
}

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new ApiError(
      `Cannot reach the SatQuery backend at ${API_BASE_URL}. Start it with ` +
        '`uvicorn backend.app.main:app`.',
    );
  }

  if (!response.ok) {
    throw new ApiError(await readErrorDetail(response));
  }

  return (await response.json()) as T;
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };

    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail) && body.detail.length > 0) {
      const first = body.detail[0] as { msg?: string };
      if (first?.msg) return first.msg;
    }
  } catch {
    /* a non-JSON error body falls through to the status line */
  }

  return `${response.status} ${response.statusText}`;
}

export function scenePreviewUrl(imageId: string): string {
  return `${API_BASE_URL}/images/${imageId}/preview`;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  return request<ProjectSummary[]>('/projects');
}

export async function createProject(name: string): Promise<ProjectSummary> {
  return request<ProjectSummary>('/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function ensureWorkspaceProject(): Promise<ProjectSummary> {
  const existing = await listProjects();
  const workspace = existing.find((project) => project.name === WORKSPACE_PROJECT_NAME);

  return workspace ?? createProject(WORKSPACE_PROJECT_NAME);
}

export async function listProjectImages(projectId: string): Promise<SceneImage[]> {
  return request<SceneImage[]>(`/projects/${projectId}/images`);
}

export async function uploadScene(projectId: string, file: File): Promise<SceneImage> {
  const form = new FormData();
  form.append('file', file);

  return request<SceneImage>(`/projects/${projectId}/images`, {
    method: 'POST',
    body: form,
  });
}

export async function runAnalysis(
  imageId: string,
  query: string,
  regionCount = 4,
): Promise<AnalysisResult> {
  return request<AnalysisResult>(`/images/${imageId}/analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, region_count: regionCount }),
  });
}
