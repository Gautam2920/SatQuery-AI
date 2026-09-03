import { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import { MetaValue } from './MetaValue';
import type { ExecutionStageData, StageState } from '@/data/types';

const STATE: Record<StageState, { fg: string; icon: IconName }> = {
  pending: { fg: 'text-secondary', icon: 'minus' },
  running: { fg: 'text-primary-strong', icon: 'activity' },
  done: { fg: 'text-verified', icon: 'check' },
  failed: { fg: 'text-tertiary-strong', icon: 'alert' },
};

/* The audit trail is the product. Every stage is individually inspectable —
   model, operation, parameters, duration. The 400ms advance is slow on purpose:
   watching the orchestrator move through its stages is how the user learns the
   product has a method. The running stage carries the sliding indeterminate bar. */
export function ExecutionStage({
  stage,
  last = false,
}: {
  stage: ExecutionStageData;
  last?: boolean;
}) {
  const { name, state, duration, details = [], diagnostic, defaultOpen = false } = stage;
  const expandable = details.length > 0 || Boolean(diagnostic);
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const s = STATE[state];
  const running = state === 'running';

  // failed stages open themselves so the diagnostic is never hidden
  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  return (
    <div className={cn(!last && 'border-b border-border')}>
      <div
        className={cn(
          'flex items-center gap-sm px-md py-sm',
          running && 'bg-primary-subtle',
          'transition-colors duration-[var(--dur-pipeline)] ease-[var(--ease-out)]',
        )}
      >
        <span
          className={s.fg}
          style={running ? { animation: 'gt-dot 1.6s var(--ease-out) infinite' } : undefined}
        >
          <Icon name={s.icon} size={13} strokeWidth={running ? 2 : 1.5} />
        </span>

        {expandable ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={bodyId}
            className={cn(
              'flex flex-1 items-center gap-sm text-left',
              running
                ? 'label-caps text-primary-strong'
                : state === 'pending'
                  ? 'data-sm text-secondary'
                  : 'data-sm text-on-surface',
            )}
          >
            <span className="flex-1">{name}</span>
            {duration && <span className="data-sm text-secondary">{duration}</span>}
            <Icon
              name="chevron-down"
              size={13}
              className={cn(
                'text-secondary transition-transform duration-[var(--dur-state)]',
                !open && '-rotate-90',
              )}
            />
          </button>
        ) : (
          <>
            <span
              className={cn(
                'flex-1',
                running
                  ? 'label-caps text-primary-strong'
                  : state === 'pending'
                    ? 'data-sm text-secondary'
                    : 'data-sm text-on-surface',
              )}
            >
              {name}
            </span>
            {duration && <span className="data-sm text-secondary">{duration}</span>}
          </>
        )}
      </div>

      {running && (
        <div className="h-[2px] overflow-hidden bg-border" aria-hidden="true">
          <div
            className="h-[2px] w-[38%] bg-primary"
            style={{ animation: 'gt-indeterminate 1.8s var(--ease-out) infinite' }}
          />
        </div>
      )}

      {open && expandable && (
        <div id={bodyId} className="flex flex-col gap-xs bg-surface-raised px-md py-sm pl-[30px]">
          {details.map((d) => (
            <MetaValue key={d.label} label={d.label} value={d.value} tone={d.tone} />
          ))}
          {diagnostic && (
            <pre className="data-sm m-0 whitespace-pre-wrap text-tertiary-strong">{diagnostic}</pre>
          )}
        </div>
      )}
    </div>
  );
}

export function ExecutionTrace({ stages }: { stages: ExecutionStageData[] }) {
  return (
    <div className="flex flex-col">
      {stages.map((stage, i) => (
        <ExecutionStage key={`${stage.name}-${i}`} stage={stage} last={i === stages.length - 1} />
      ))}
    </div>
  );
}
