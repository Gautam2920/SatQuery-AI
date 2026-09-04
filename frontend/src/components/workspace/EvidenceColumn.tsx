import { cn } from '@/lib/cn';
import { AnswerBlock } from '@/components/ui/AnswerBlock';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { ConfidenceMeter } from '@/components/ui/ConfidenceMeter';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ExecutionTrace } from '@/components/ui/ExecutionStage';
import { Icon } from '@/components/ui/Icon';
import { ProvenanceChip } from '@/components/ui/ProvenanceChip';
import { SectionHeader } from '@/components/ui/Panel';
import type { EvidenceRegion, Run } from '@/data/types';
import type { PipelineStatus } from '@/hooks/useRunPipeline';
import type { ExecutionStageData } from '@/data/types';

const REGION_COLS: Column<EvidenceRegion>[] = [
  {
    key: 'id',
    label: 'Rgn',
    render: (r) => <span className={r.alert ? 'text-secondary' : 'text-primary'}>{r.id}</span>,
  },
  { key: 'className', label: 'Class', render: (r) => r.className },
  {
    key: 'area',
    label: 'Area',
    align: 'right',
    render: (r) => <span className="text-verified">{r.area}</span>,
  },
  {
    key: 'confidence',
    label: 'Conf',
    align: 'right',
    render: (r) => (
      <span
        className={cn(
          'inline-flex items-center justify-end gap-[3px]',
          r.alert && 'text-tertiary-strong',
        )}
      >
        {r.alert && <Icon name="alert" size={10} />}
        {r.confidence.toFixed(2)}
      </span>
    ),
  },
];

function AnswerHeader({ run, onRefClick }: { run: Run; onRefClick: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-[14px] border-b border-border bg-surface p-lg">
      <div className="flex flex-wrap gap-xs">
        {(run.provenance ?? ['interpreted']).map((p) => (
          <ProvenanceChip key={p} kind={p} />
        ))}
      </div>
      <AnswerBlock tokens={run.answer ?? []} onRefClick={onRefClick} />
      <ConfidenceMeter value={run.confidence ?? 0} note={run.confidenceNote} />
    </div>
  );
}

export function EvidenceColumn({
  status,
  displayStages,
  run,
  selectedId,
  onSelect,
  onExport,
  onRefine,
  onFix,
  onEditPlan,
  fixLabel = 'Reproject parcel layer',
}: {
  status: PipelineStatus;
  displayStages: ExecutionStageData[];
  run: Run | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onExport: () => void;
  onRefine: () => void;
  onFix: () => void;
  onEditPlan: () => void;
  fixLabel?: string;
}) {
  const regions = run?.regions ?? [];

  return (
    <aside className="gt-scroll flex w-full max-w-[var(--col-evidence)] flex-none flex-col overflow-y-auto border-l border-border bg-neutral pb-lg max-[1100px]:max-w-none">
      {status === 'idle' && (
        <>
          <SectionHeader>Result</SectionHeader>
          <p className="body-sm prose-measure px-lg text-secondary">
            No run yet. Load a scene and ask a question. The answer, its confidence, the evidence
            behind it and the full execution trace appear here.
          </p>
        </>
      )}

      {status === 'running' && (
        <>
          <SectionHeader>Execution trace</SectionHeader>
          <div className="px-lg">
            <ExecutionTrace stages={displayStages} />
          </div>
          <p className="body-sm px-lg py-md text-secondary">
            Stages advance one at a time. Each is inspectable while the run is still open.
          </p>
        </>
      )}

      {status === 'answer' && run && (
        <>
          <AnswerHeader run={run} onRefClick={onSelect} />

          {regions.length > 0 && (
            <>
              <SectionHeader meta={`${regions.length} regions`}>Evidence</SectionHeader>
              <div className="px-lg">
                <DataTable
                  columns={REGION_COLS}
                  rows={regions}
                  activeId={selectedId ?? undefined}
                  onRowClick={(r) => onSelect(r.id)}
                  caption="Grounded regions with measured area and confidence"
                />
              </div>

              <SectionHeader>Evidence crops</SectionHeader>
              <div className="flex flex-wrap gap-[10px] px-lg">
                {regions
                  .filter((r) => !r.alert)
                  .map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onSelect(r.id)}
                      className={cn(
                        'w-[120px] border bg-surface text-left transition-colors duration-[var(--dur-state)]',
                        selectedId === r.id ? 'border-primary' : 'border-border',
                      )}
                    >
                      <span className="data-sm flex h-[70px] items-center justify-center bg-neutral text-secondary">
                        {r.id} CROP
                      </span>
                      <span className="data-sm block p-[6px] text-verified">{r.area}</span>
                    </button>
                  ))}
              </div>
            </>
          )}

          <SectionHeader meta={`${displayStages.length} stages · ${run.elapsed}`}>
            Execution trace
          </SectionHeader>
          <div className="px-lg">
            <ExecutionTrace stages={displayStages} />
          </div>

          <div className="flex flex-wrap gap-sm p-lg">
            <Button size="sm" onClick={onExport}>
              Export report
            </Button>
            <Button size="sm" variant="secondary" onClick={onRefine}>
              Refine query
            </Button>
          </div>
        </>
      )}

      {status === 'failure' && run && (
        <>
          <SectionHeader>Result · run {run.id}</SectionHeader>
          <div className="px-lg pb-[14px]">
            <Callout title="Run halted">{run.failure}</Callout>
          </div>
          <SectionHeader>Trace</SectionHeader>
          <div className="px-lg">
            <ExecutionTrace stages={displayStages} />
          </div>
          <div className="flex flex-wrap gap-sm p-lg">
            <Button size="sm" onClick={onFix}>
              {fixLabel}
            </Button>
            <Button size="sm" variant="secondary" onClick={onEditPlan}>
              Edit plan
            </Button>
          </div>
        </>
      )}
    </aside>
  );
}
