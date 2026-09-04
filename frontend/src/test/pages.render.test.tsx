import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from '@/App';
import { stubSessionOnlyBackend } from './session';
import { clearStoredSession } from '@/lib/session';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('every route renders without throwing', () => {
  // Every route below /signin is guarded, and a guarded page only renders once
  // the backend has confirmed the token, so each render awaits that round trip.
  beforeEach(() => stubSessionOnlyBackend());
  afterEach(() => vi.unstubAllGlobals());

  it('landing', () => {
    renderAt('/');
    expect(
      screen.getByRole('heading', { level: 1, name: /Ask the scene a question/i }),
    ).toBeInTheDocument();
    // the technology marquee exists and is labelled
    expect(screen.getByRole('group', { name: /Technology stack/i })).toBeInTheDocument();
  });

  it('sign in', () => {
    clearStoredSession();
    renderAt('/signin');
    expect(screen.getByLabelText('Work email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('scene library', async () => {
    renderAt('/library');
    expect(await screen.findByText('Scene library')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in workspace' })).toBeInTheDocument();
  });

  it('workspace — empty state', async () => {
    renderAt('/workspace');
    expect(await screen.findByText(/No run yet/)).toBeInTheDocument();
  });

  it('workspace — deep link to a finished run', async () => {
    renderAt('/workspace?run=0f3a91');
    expect(await screen.findByText(/12.84 km²/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export report' })).toBeInTheDocument();
  });

  it('workspace — deep link to the failed run shows the halt, not an answer', async () => {
    renderAt('/workspace?run=0f3a12');
    expect(await screen.findByText('Run halted')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export report' })).not.toBeInTheDocument();
  });

  it('workspace — a change-detection run redirects to /compare', async () => {
    render(
      <MemoryRouter initialEntries={['/workspace?run=0f3a70']}>
        <Routes>
          <Route path="*" element={<App />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: /Bi-temporal change detection/i }),
    ).toBeInTheDocument();
  });

  it('run history', async () => {
    renderAt('/history');
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Where is the flooded cropland?')).toBeInTheDocument();
  });

  it('compare', async () => {
    renderAt('/compare');
    expect(await screen.findByText(/live change runs are not wired/)).toBeInTheDocument();
  });

  it('unknown route falls through to 404', () => {
    renderAt('/nope');
    expect(screen.getByText(/not part of the workspace/i)).toBeInTheDocument();
  });
});
