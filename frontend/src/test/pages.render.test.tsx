import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from '@/App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('every route renders without throwing', () => {
  it('landing', () => {
    renderAt('/');
    expect(
      screen.getByRole('heading', { level: 1, name: /Ask the scene a question/i }),
    ).toBeInTheDocument();
    // the technology marquee exists and is labelled
    expect(screen.getByRole('group', { name: /Technology stack/i })).toBeInTheDocument();
  });

  it('sign in', () => {
    renderAt('/signin');
    expect(screen.getByLabelText('Work email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('scene library', () => {
    renderAt('/library');
    expect(screen.getByText('Scene library')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in workspace' })).toBeInTheDocument();
  });

  it('workspace — empty state', () => {
    renderAt('/workspace');
    expect(screen.getByText(/No run yet/)).toBeInTheDocument();
  });

  it('workspace — deep link to a finished run', () => {
    renderAt('/workspace?run=0f3a91');
    expect(screen.getByText(/12.84 km²/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export report' })).toBeInTheDocument();
  });

  it('workspace — deep link to the failed run shows the halt, not an answer', () => {
    renderAt('/workspace?run=0f3a12');
    expect(screen.getByText('Run halted')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export report' })).not.toBeInTheDocument();
  });

  it('workspace — a change-detection run redirects to /compare', () => {
    render(
      <MemoryRouter initialEntries={['/workspace?run=0f3a70']}>
        <Routes>
          <Route path="*" element={<App />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { name: /Bi-temporal change detection/i }),
    ).toBeInTheDocument();
  });

  it('run history', () => {
    renderAt('/history');
    const table = screen.getByRole('table');
    expect(within(table).getByText('Where is the flooded cropland?')).toBeInTheDocument();
  });

  it('compare', () => {
    renderAt('/compare');
    expect(screen.getByText(/live change runs are not wired/)).toBeInTheDocument();
  });

  it('unknown route falls through to 404', () => {
    renderAt('/nope');
    expect(screen.getByText(/not part of the workspace/i)).toBeInTheDocument();
  });
});
