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
import { ensureWorkspaceProject, listProjectImages } from '@/lib/api';
import { isAnalysable } from '@/hooks/useLiveScenes';

const ANALYSIS_TIMEOUT_MS = 120_000;

let backendReady = false;

beforeAll(async () => {
  try {
    const project = await ensureWorkspaceProject();
    backendReady = (await listProjectImages(project.id)).some(isAnalysable);
  } catch {
    backendReady = false;
  }

  if (!backendReady) {
    console.warn('[e2e] skipped — no reachable backend with an analysable scene');
  }
});

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
