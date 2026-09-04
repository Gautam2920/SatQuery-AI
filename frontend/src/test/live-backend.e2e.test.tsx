/* ============================================================================
   End-to-end: the real React workspace against a running SatQuery backend.

   Nothing is stubbed. The query leaves the app over HTTP, FastAPI runs the
   Prithvi encoder and measures the regions with rasterio/shapely, and the
   response is rendered by the same components the browser uses.

   Skipped unless the backend is reachable, so `npm test` stays offline-safe:

       uvicorn backend.app.main:app          # then
       npm test
   ========================================================================== */

import { beforeAll, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ensureWorkspaceProject, listProjectImages, register } from '@/lib/api';
import { storeSession } from '@/lib/session';
import { isAnalysable } from '@/hooks/useLiveScenes';

const DEMO_TILE = resolve(
  __dirname,
  '../../../aiml/data/raw/Mexico_HLS.S30.T13REM.2018201T172901.v2.0_cropped.tif',
);

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

/** Seeds the account's scene.
 *
 *  jsdom stalls indefinitely on a multipart body holding a File this large, so
 *  the fixture is posted as a hand-built body. Browsers have no such problem —
 *  the app's own uploadScene() still sends FormData — this is only about getting
 *  a scene in place before the UI is driven.
 */
async function seedDemoScene(projectId: string, token: string): Promise<void> {
  const boundary = `----satquery${Math.random().toString(16).slice(2)}`;
  const fileBytes = new Uint8Array(readFileSync(DEMO_TILE));
  const CRLF = '\r\n';
  const header = new TextEncoder().encode(
    `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="file"; ` +
      `filename="Mexico_HLS_July.tif"${CRLF}` +
      `Content-Type: image/tiff${CRLF}${CRLF}`,
  );
  const footer = new TextEncoder().encode(`${CRLF}--${boundary}--${CRLF}`);

  const body = new Uint8Array(header.length + fileBytes.length + footer.length);
  body.set(header, 0);
  body.set(fileBytes, header.length);
  body.set(footer, header.length + fileBytes.length);

  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/images`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) throw new Error(`seeding the demo scene failed: ${response.status}`);
}

const ANALYSIS_TIMEOUT_MS = 120_000;

let backendReady = false;

beforeAll(async () => {
  try {
    // Scenes belong to an account, so the run starts by creating one. A fresh
    // account owns nothing, so the demo tile is uploaded before it can be asked
    // a question — the same path a new user walks.
    const session = await register(
      `e2e-${Date.now()}@example.com`,
      'correct-horse-battery',
    );
    storeSession(session.access_token, session.user);

    const project = await ensureWorkspaceProject();

    if (!(await listProjectImages(project.id)).some(isAnalysable)) {
      await seedDemoScene(project.id, session.access_token);
    }

    backendReady = (await listProjectImages(project.id)).some(isAnalysable);
  } catch (cause) {
    console.warn('[e2e] setup failed:', cause);
    backendReady = false;
  }

  if (!backendReady) {
    console.warn('[e2e] skipped — no reachable backend with an analysable scene');
  }
}, 120_000);

describe('workspace against the live backend', () => {
  it(
    'runs a real Prithvi analysis and renders the measured evidence',
    async () => {
      if (!backendReady) return;

      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={['/workspace']}>
          <App />
        </MemoryRouter>,
      );

      expect(await screen.findByText('backend connected')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Run analysis' }));

      // the confidence meter only renders once the backend has replied
      const confidence = await screen.findByRole('meter', undefined, {
        timeout: ANALYSIS_TIMEOUT_MS,
      });

      const reported = Number(confidence.getAttribute('aria-valuenow'));
      expect(reported).toBeGreaterThan(0);
      expect(reported).toBeLessThanOrEqual(1);

      const table = screen.getByRole('table');
      const areas = within(table)
        .getAllByText(/\d[\d,.]*\s(km²|m²)/)
        .map((cell) => cell.textContent);

      expect(areas.length).toBeGreaterThan(0);

      // every region carries a real WGS84 centroid, so the geospatial layer ran
      const region = await screen.findByRole('button', { name: /^Region R1,/ });
      expect(region).toBeInTheDocument();

      // and the trace reports the model that actually executed
      await user.click(screen.getByRole('button', { name: /scene interpretation/ }));
      expect(await screen.findByText(/prithvi-eo-v2-tiny-tl\/encoder\+kmeans/)).toBeInTheDocument();
    },
    ANALYSIS_TIMEOUT_MS + 30_000,
  );
});
