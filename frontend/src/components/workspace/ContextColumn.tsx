import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Divider';
import { MetaValue } from '@/components/ui/MetaValue';
import { QueryInput, StaticQuery } from '@/components/ui/QueryInput';
import { StatusDot } from '@/components/ui/StatusDot';
import { Tooltip } from '@/components/ui/Tooltip';
import type { Run, Scene } from '@/data/types';
import type { PipelineStatus } from '@/hooks/useRunPipeline';

const SUGGESTED = [
  'Where is the water?',
  'Where is the built-up ground?',
  'Summarise this scene',
];
const REFINE = ['restrict to cropland only', 'exclude saturated soil', 'compare to 2019'];
const DEFAULT_PLAN =
  'Detect inundation from NDWI and SAR backscatter, intersect with the cropland mask, aggregate area per region.';

function useElapsed(active: boolean, key: string) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    setSeconds(0);
    const started = Date.now();
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [active, key]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function LayerToggles({ layers }: { layers: string[] }) {
  const [state, setState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(layers.map((l) => [l, true])),
  );
  const all = useMemo(() => [...layers, 'SAR VV overlay'], [layers]);
  return (
    <div className="data-sm flex flex-col gap-[7px]">
      {all.map((name) => {
        const on = state[name] ?? false;
        return (
          <div key={name} className="flex items-center justify-between text-on-surface">
            <span>{name}</span>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => setState((s) => ({ ...s, [name]: !on }))}
              className={cn(
                'data-sm rounded-control border px-[6px] py-px transition-colors duration-[var(--dur-state)]',
                on ? 'border-primary text-primary' : 'border-border text-secondary',
              )}
            >
              {on ? 'on' : 'off'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function ContextColumn({
  status,
  scene,
  query,
  onQuery,
  onRun,
  onStop,
  onChangeScene,
  run,
  note,
  scenePanel,
}: {
  status: PipelineStatus;
  scene: Scene;
  query: string;
  onQuery: (v: string) => void;
  onRun: (q: string) => void;
  onStop: () => void;
  onChangeScene: () => void;
  run: Run | null;
  note: string | null;
  /** live scene controls; replaces the static scene metadata block when present */
  scenePanel?: ReactNode;
}) {
  const elapsed = useElapsed(status === 'running', run?.id ?? 'none');

  return (
    <aside className="gt-scroll flex w-[var(--col-context)] flex-none flex-col gap-lg overflow-y-auto border-r border-border bg-neutral p-lg max-[760px]:w-full">
      {status === 'running' && run ? (
        <>
          <span className="label-caps text-secondary">Query</span>
          <StaticQuery>{run.query}</StaticQuery>
          <div className="flex items-center gap-sm">
            <StatusDot tone="running" pulse />
            <span className="data-sm text-primary-strong">
              run {run.id} · running · {elapsed}
            </span>
          </div>
          <Divider />
          <span className="label-caps text-secondary">Plan</span>
          <p className="body-sm text-secondary">{run.plan ?? DEFAULT_PLAN}</p>
          <div className="flex flex-wrap gap-sm">
            <Button size="sm" variant="secondary" onClick={onStop}>
              Stop run
            </Button>
            <Button size="sm" variant="secondary" onClick={onStop}>
              Edit plan
            </Button>
          </div>
        </>
      ) : status === 'answer' && run ? (
        <>
          <span className="label-caps text-secondary">Query</span>
          <QueryInput
            value={query}
            onChange={onQuery}
            onSubmit={onRun}
            submitLabel="Run analysis"
            hint="⌘⏎ to run · a refined query is a new run"
          />
          <span className="label-caps text-secondary">Refine — adds a stage, new run</span>
          <div className="flex flex-wrap gap-xs">
            {REFINE.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRun(`${run.query} — ${r}`)}
                className="data-sm rounded-control border border-border px-[7px] py-[3px] text-on-surface transition-colors duration-[var(--dur-state)] hover:border-primary hover:text-primary"
              >
                {r}
              </button>
            ))}
          </div>
          <Divider />
          {scenePanel ?? (
            <>
              <span className="label-caps text-secondary">Scene</span>
              <MetaValue label="Id" value={scene.id} />
              <MetaValue label="Pass" value={scene.pass} />
              <MetaValue label="GSD" value={scene.gsd} tone="measured" />
              <MetaValue
                label="CRS"
                value={
                  <Tooltip content="Universal Transverse Mercator zone 31N, WGS 84 datum.">
                    {scene.crs}
                  </Tooltip>
                }
              />
            </>
          )}
          <Divider />
          <span className="label-caps text-secondary">Layers</span>
          <LayerToggles
            layers={run.layers ?? ['true colour', 'inundation mask', 'cropland mask']}
          />
          <span className="flex-1" />
          <span className="data-sm text-secondary">
            run {run.id} · {run.date} · {run.elapsed}
          </span>
        </>
      ) : (
        <>
          {(status === 'failure' || status === 'refused') && (
            <>
              <span className="label-caps text-secondary">Query</span>
              <QueryInput
                value={query}
                onChange={onQuery}
                onSubmit={onRun}
                submitLabel="Run analysis"
                hint="⌘⏎ to run"
              />
              <Divider />
            </>
          )}
          {scenePanel ?? (
            <>
              <span className="label-caps text-secondary">Scene</span>
              <MetaValue label="Id" value={scene.id} />
              <MetaValue label="CRS" value={scene.crs} />
              <Button size="sm" variant="secondary" onClick={onChangeScene}>
                Change scene
              </Button>
            </>
          )}

          {status === 'idle' && (
            <>
              <Divider />
              <span className="label-caps text-secondary">Ask</span>
              <QueryInput
                value={query}
                onChange={onQuery}
                onSubmit={onRun}
                submitLabel="Run analysis"
                hint="⌘⏎ to run · the question stays above its answer"
              />
              <div className="flex flex-col gap-sm">
                <span className="label-caps text-secondary">Suggested</span>
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onRun(s)}
                    className="body-sm text-left text-primary hover:text-primary-strong hover:underline"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
          {note && <p className="body-sm text-secondary">{note}</p>}
        </>
      )}
    </aside>
  );
}
