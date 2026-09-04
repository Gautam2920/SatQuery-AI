import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { signInForTest } from './session';
import { requestMethod, requestUrl } from './http';

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
  dtype: 'int16',
  file_size: 3014272,
  crs: 'EPSG:32613',
  storage_key: 'img-1.tif',
};

const SCENE = {
  id: 'Mexico_HLS',
  sensor: 'HLS Sentinel-2',
  pass: 'loaded scene',
  crs: 'EPSG:32613',
  gsd: '30 m/px',
  extent: '6.72 x 6.72 km',
  kind: 'optical',
  centerLatitude: 28.7451,
  centerLongitude: -104.7527,
};

function refusal(outcome: 'unsupported' | 'insufficient_evidence', message: string) {
  return {
    runId: 'r1',
    imageId: 'img-1',
    outcome,
    refusal: message,
    query: 'anything',
    intent: outcome === 'unsupported' ? 'unsupported: out of scope' : 'locate water',
    elapsed: '0.01 s',
    scene: SCENE,
    answer: [],
    confidence: null,
    confidenceNote: message,
    provenance: [],
    regions: [],
    stages: [
      { name: 'query understanding', state: 'done', duration: '0.00 s', details: [] },
    ],
  };
}

function jsonResponse(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
}

function previewResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    blob: () => Promise.resolve(new Blob([new Uint8Array([137, 80, 78, 71])])),
  } as unknown as Response);
}

function mockBackend(analysisBody: unknown) {
  return vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
    const url = requestUrl(input);
    if (url.endsWith('/auth/me')) return jsonResponse(ACCOUNT);
    if (url.endsWith('/preview')) return previewResponse();
    if (url.endsWith('/projects')) return jsonResponse([PROJECT]);
    if (url.endsWith(`/projects/${PROJECT.id}/images`)) return jsonResponse([SCENE_IMAGE]);
    if (url.endsWith('/analysis')) return jsonResponse(analysisBody);
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

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe('a query the system cannot answer', () => {
  const message =
    'This query is not currently supported by SatQuery AI. It answers questions about land cover.';

  it('shows the refusal and never an answer or confidence', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', mockBackend(refusal('unsupported', message)));

    renderWorkspace();
    await screen.findByText('backend connected');
    await user.click(screen.getByRole('button', { name: 'Run analysis' }));

    expect(await screen.findByText(/Outside what this build can answer/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(message.slice(0, 40)))).toBeInTheDocument();

    // nothing that would imply an analysis ran
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export report' })).not.toBeInTheDocument();
  });

  it('reports only the stages that actually ran', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', mockBackend(refusal('unsupported', message)));

    renderWorkspace();
    await screen.findByText('backend connected');
    await user.click(screen.getByRole('button', { name: 'Run analysis' }));

    expect(await screen.findByText(/query understanding/)).toBeInTheDocument();
    expect(screen.queryByText(/scene interpretation/)).not.toBeInTheDocument();
    expect(screen.queryByText(/geospatial computation/)).not.toBeInTheDocument();
  });

  it('still lets the analyst ask another question', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', mockBackend(refusal('unsupported', message)));

    renderWorkspace();
    await screen.findByText('backend connected');
    await user.click(screen.getByRole('button', { name: 'Run analysis' }));

    await screen.findByText(/Outside what this build can answer/);
    expect(screen.getByRole('button', { name: 'Run analysis' })).toBeInTheDocument();
  });
});

describe('a scene with too little evidence', () => {
  const message =
    'No pixel in the analysed tile satisfies locate water. The spectral indices did not meet the threshold.';

  it('explains the shortfall instead of inventing an answer', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', mockBackend(refusal('insufficient_evidence', message)));

    renderWorkspace();
    await screen.findByText('backend connected');
    await user.click(screen.getByRole('button', { name: 'Run analysis' }));

    expect(await screen.findByText(/Not enough evidence in this scene/)).toBeInTheDocument();
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('the canvas coordinate readout', () => {
  it('reports the measured scene centre, not a fixed placeholder', async () => {
    vi.stubGlobal('fetch', mockBackend(refusal('unsupported', 'x')));

    renderWorkspace();
    await screen.findByText('backend connected');

    // the old build printed 48.8123°N 2.0311°E over every scene, including Mexico
    expect(screen.queryByText(/48\.8123°N/)).not.toBeInTheDocument();
  });
});

describe('dropping a GeoTIFF on the canvas', () => {
  function dropFile(target: HTMLElement, file: File) {
    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', type: file.type }],
      types: ['Files'],
    };

    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });
  }

  it('uploads the dropped scene to the backend', async () => {
    const fetchMock = mockBackend(refusal('unsupported', 'x'));
    vi.stubGlobal('fetch', fetchMock);

    renderWorkspace();
    await screen.findByText('backend connected');

    const canvas = screen.getByRole('main');
    dropFile(canvas, new File(['tif-bytes'], 'scene.tif', { type: 'image/tiff' }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            requestUrl(url).endsWith(`/projects/${PROJECT.id}/images`) &&
            requestMethod(init) === 'POST',
        ),
      ).toBe(true),
    );
  });

  it('rejects a file that is not a GeoTIFF without uploading it', async () => {
    const fetchMock = mockBackend(refusal('unsupported', 'x'));
    vi.stubGlobal('fetch', fetchMock);

    renderWorkspace();
    await screen.findByText('backend connected');

    const canvas = screen.getByRole('main');
    dropFile(canvas, new File(['nope'], 'holiday.png', { type: 'image/png' }));

    expect(await screen.findByText(/holiday\.png is not a GeoTIFF/)).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          requestUrl(url).endsWith(`/projects/${PROJECT.id}/images`) &&
          requestMethod(init) === 'POST',
      ),
    ).toBe(false);
  });
});
