import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { ApiError, runAnalysis } from '@/lib/api';
import { signInForTest } from './session';
import { requestUrl } from './http';

const ACCOUNT = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'analyst@example.com',
  is_verified: true,
  created_at: '2026-01-01T00:00:00Z',
};

const PROJECT = { id: 'p-1', name: 'SatQuery workspace' };

const SCENE_IMAGE = {
  id: 'img-1',
  filename: 'Mexico_HLS.tif',
  width: 560,
  height: 448,
  band_count: 6,
  crs: 'EPSG:32613',
  storage_key: 'img-1.tif',
};

const ANALYSIS = {
  runId: 'a1b2c3',
  imageId: 'img-1',
  outcome: 'answered',
  refusal: null,
  query: 'Where is the vegetation?',
  intent: 'locate vegetation',
  elapsed: '3.11 s',
  scene: {
    id: 'Mexico_HLS',
    sensor: 'HLS Sentinel-2',
    pass: 'loaded scene',
    crs: 'EPSG:32613',
    gsd: '30 m/px',
    extent: '6.72 x 6.72 km',
    kind: 'optical',
  },
  answer: [
    { t: 'text', value: 'Analysis of vegetation covers ' },
    { t: 'value', value: '16.59 km²', tone: 'measured' },
    { t: 'text', value: ' across 2 regions, the largest being ' },
    { t: 'ref', value: 'R1', regionId: 'R1' },
    { t: 'text', value: '.' },
  ],
  confidence: 0.72,
  confidenceNote: 'area-weighted spectral agreement across 2 regions',
  provenance: ['interpreted', 'measured'],
  regions: [
    {
      id: 'R1',
      className: 'dense vegetation',
      area: '5.76 km²',
      perimeter: '18.40 km',
      confidence: 0.8,
      centroid: '28.7451N 104.7527W',
      bands: 'B04 B8A · NDVI',
      provenance: 'measured',
      box: { left: '7.1%', top: '35.7%', width: '85.7%', height: '28.6%' },
    },
  ],
  stages: [
    {
      name: 'query understanding',
      state: 'done',
      duration: '0.00 s',
      details: [{ label: 'resolver', value: 'keyword-rule-v1' }],
    },
    {
      name: 'scene interpretation',
      state: 'done',
      duration: '1.98 s',
      details: [{ label: 'model', value: 'prithvi-eo-v2-tiny-tl/encoder+kmeans' }],
    },
  ],
};

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) } as Response;
}

function previewResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    blob: () => Promise.resolve(new Blob([new Uint8Array([137, 80, 78, 71])])),
  } as unknown as Response);
}

function mockBackend(analysis: unknown = ANALYSIS, images = [SCENE_IMAGE]) {
  return vi.fn((input: RequestInfo | URL) => {
    const url = requestUrl(input);

    if (url.endsWith('/auth/me')) return jsonResponse(ACCOUNT);
    if (url.endsWith('/preview')) return previewResponse();
    if (url.endsWith('/projects')) return jsonResponse([PROJECT]);
    if (url.endsWith(`/projects/${PROJECT.id}/images`)) return jsonResponse(images);
    if (url.endsWith('/analysis')) return jsonResponse(analysis);

    return Promise.reject(new Error(`unexpected request: ${url}`));
  });
}

function renderWorkspace() {
  signInForTest();

  return render(
    <MemoryRouter initialEntries={['/workspace']}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('live workspace', () => {
  beforeEach(() => vi.stubGlobal('fetch', mockBackend()));

  it('connects to the backend and shows the loaded scene', async () => {
    renderWorkspace();

    expect(await screen.findByText('backend connected')).toBeInTheDocument();
    expect(screen.getAllByText('Mexico_HLS.tif').length).toBeGreaterThan(0);
    expect(screen.getAllByText('EPSG:32613').length).toBeGreaterThan(0);
  });

  it('renders the imagery preview of the analysed tile', async () => {
    renderWorkspace();

    const preview = await screen.findByAltText(/True-colour render of the analysed tile/);

    // The endpoint needs a bearer token, which an <img> cannot send, so the PNG
    // is fetched and handed to the canvas as an object URL.
    expect(preview).toHaveAttribute('src', expect.stringContaining('blob:'));
    const requestedPreview = vi
      .mocked(fetch)
      .mock.calls.some(([input]) => requestUrl(input).endsWith('/images/img-1/preview'));

    expect(requestedPreview).toBe(true);
  });

  it('runs a real analysis and renders the measured evidence it returns', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await screen.findByText('backend connected');
    await user.click(screen.getByRole('button', { name: 'Run analysis' }));

    expect(await screen.findByText(/16.59 km²/)).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(within(table).getByText('dense vegetation')).toBeInTheDocument();
    expect(within(table).getByText('5.76 km²')).toBeInTheDocument();

    expect(screen.getByText('1.98 s')).toBeInTheDocument();

    // the trace is inspectable: expanding a stage reveals what actually ran
    await user.click(screen.getByRole('button', { name: /scene interpretation/ }));

    expect(
      await screen.findByText('prithvi-eo-v2-tiny-tl/encoder+kmeans'),
    ).toBeInTheDocument();
  });

  it('draws a canvas region positioned by the measured pixel bounds', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await screen.findByText('backend connected');
    await user.click(screen.getByRole('button', { name: 'Run analysis' }));

    const region = await screen.findByRole('button', {
      name: /Region R1, dense vegetation, 5.76 km²/,
    });

    expect(region).toHaveStyle({ left: '7.1%', top: '35.7%' });
  });

  it('surfaces a backend failure instead of falling back to authored data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = requestUrl(input);

        if (url.endsWith('/auth/me')) return jsonResponse(ACCOUNT);
        if (url.endsWith('/projects')) return jsonResponse([PROJECT]);
        if (url.endsWith(`/projects/${PROJECT.id}/images`)) return jsonResponse([SCENE_IMAGE]);

        return {
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entity',
          json: () => Promise.resolve({ detail: 'Prithvi requires 6 bands' }),
        } as Response;
      }),
    );

    const user = userEvent.setup();
    renderWorkspace();

    await screen.findByText('backend connected');
    await user.click(screen.getByRole('button', { name: 'Run analysis' }));

    expect(await screen.findByText('Run halted')).toBeInTheDocument();
    expect(screen.getByText('Prithvi requires 6 bands')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export report' })).not.toBeInTheDocument();
  });
});

describe('backend unavailable', () => {
  it('reports the outage and leaves the workspace empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        if (requestUrl(input).endsWith('/auth/me')) return jsonResponse(ACCOUNT);

        return Promise.reject(new TypeError('fetch failed'));
      }),
    );

    renderWorkspace();

    expect(await screen.findByText('backend unavailable')).toBeInTheDocument();
    expect(screen.getByText(/No run yet/)).toBeInTheDocument();
  });

  it('sends the visitor to sign in when the backend cannot confirm the session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('fetch failed'))),
    );

    renderWorkspace();

    // A token that cannot be checked is not a session, so no guarded page renders.
    expect(await screen.findByLabelText('Work email')).toBeInTheDocument();
    expect(screen.queryByText(/No run yet/)).not.toBeInTheDocument();
  });

  it('keeps a scene the model cannot consume but marks it preview only', async () => {
    vi.stubGlobal('fetch', mockBackend(ANALYSIS, [{ ...SCENE_IMAGE, band_count: 3 }]));

    renderWorkspace();

    await screen.findByText('backend connected');

    // the import is not silently discarded - it is shown and explained
    expect(screen.getAllByText('Mexico_HLS.tif').length).toBeGreaterThan(0);
    expect(screen.getByText('Cannot be analysed')).toBeInTheDocument();
    expect(screen.getByText(/This scene has/)).toBeInTheDocument();
  });
});

describe('api client', () => {
  it('raises a helpful error when the backend cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('fetch failed'))),
    );

    await expect(runAnalysis('img-1', 'where is the water')).rejects.toBeInstanceOf(ApiError);
  });

  it('surfaces the backend detail message on a rejected request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: () => Promise.resolve({ detail: 'Image not found' }),
        } as Response),
      ),
    );

    await expect(runAnalysis('img-1', 'where is the water')).rejects.toThrow('Image not found');
  });
});
