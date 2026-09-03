import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConfidenceMeter } from '@/components/ui/ConfidenceMeter';
import { ExecutionTrace } from '@/components/ui/ExecutionStage';
import { EvidenceColumn } from '@/components/workspace/EvidenceColumn';
import { getRun } from '@/data/runs';

describe('ConfidenceMeter', () => {
  it('shows value, band and an accessible meter', () => {
    render(<ConfidenceMeter value={0.82} />);
    expect(screen.getByText('0.82')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuenow', '0.82');
  });

  it('flags a low score on the band label only', () => {
    render(<ConfidenceMeter value={0.41} />);
    expect(screen.getByText('Low')).toHaveClass('text-tertiary-strong');
  });
});

describe('ExecutionTrace', () => {
  it('renders a failed stage with its diagnostic expanded', () => {
    const failed = getRun('0f3a12')!;
    render(<ExecutionTrace stages={failed.stages ?? []} />);
    expect(screen.getByText('geospatial computation')).toBeInTheDocument();
    expect(screen.getByText(/parcel layer never reprojected/)).toBeInTheDocument();
  });
});

describe('EvidenceColumn', () => {
  const noop = () => {};

  it('idle state invites a run without fabricating a result', () => {
    render(
      <MemoryRouter>
        <EvidenceColumn
          status="idle"
          displayStages={[]}
          run={null}
          selectedId={null}
          onSelect={noop}
          onExport={noop}
          onRefine={noop}
          onFix={noop}
          onEditPlan={noop}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/No run yet/)).toBeInTheDocument();
  });

  it('answer state renders the answer, confidence and evidence table', () => {
    const run = getRun('0f3a91')!;
    render(
      <MemoryRouter>
        <EvidenceColumn
          status="answer"
          displayStages={run.stages ?? []}
          run={run}
          selectedId="R1"
          onSelect={noop}
          onExport={noop}
          onRefine={noop}
          onFix={noop}
          onEditPlan={noop}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/12.84 km²/)).toBeInTheDocument();
    expect(screen.getByText('0.82')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export report' })).toBeInTheDocument();
    // every evidence item is provenance-tagged
    expect(screen.getAllByText(/interpreted|measured/).length).toBeGreaterThan(0);
  });
});
