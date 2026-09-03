import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Divider';
import { Icon } from '@/components/ui/Icon';
import { Overlay } from '@/components/ui/Overlay';
import { band } from '@/data/runs';
import type { Run } from '@/data/types';

const FORMATS = [
  { name: 'PDF report', desc: 'answer, confidence, evidence table, trace, scene metadata' },
  { name: 'Evidence bundle', desc: 'GeoJSON regions, mask GeoTIFF, crops, run.json' },
  { name: 'CSV measurements', desc: 'one row per region, units in header' },
];

/* Export slide-over (wireframe 1j). Every export carries the signing user and
   the run id. */
export function ExportPanel({ run, onClose }: { run: Run; onClose: () => void }) {
  const titleId = useId();
  const [format, setFormat] = useState(0);
  const [includes, setIncludes] = useState<Record<string, boolean>>({
    'execution trace': true,
    'low-confidence regions': true,
    'model versions & parameters': true,
    'canvas figure (letterboxed)': false,
  });
  const [generated, setGenerated] = useState(false);

  const conf = run.confidence;
  const summary = run.exportSummary ?? run.query;

  return (
    <Overlay onClose={onClose} labelledBy={titleId} align="end">
      <div className="gt-scroll flex h-full w-[520px] max-w-full flex-col gap-[14px] overflow-y-auto border-l border-border bg-surface p-lg shadow-[var(--shadow-float)]">
        <div className="flex items-center gap-md">
          <span id={titleId} className="label-caps flex-1 text-secondary">
            Export run {run.id}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export"
            className="flex h-[24px] w-[24px] items-center justify-center rounded-control border border-border text-secondary hover:border-primary hover:text-primary"
          >
            <Icon name="x" size={12} />
          </button>
        </div>

        <div className="flex flex-col gap-sm">
          {FORMATS.map((f, i) => {
            const sel = i === format;
            return (
              <button
                key={f.name}
                type="button"
                aria-pressed={sel}
                onClick={() => setFormat(i)}
                className={cn(
                  'rounded-control border p-[10px_12px] text-left transition-colors duration-[var(--dur-state)]',
                  sel ? 'border-primary' : 'border-border',
                )}
              >
                <span className="flex items-center gap-[6px]">
                  {sel && <Icon name="check" size={12} className="text-primary" />}
                  <span className="title-sm text-[length:var(--text-label-caps-size)]">
                    {f.name}
                  </span>
                  {sel && <span className="label-caps ml-auto text-primary">selected</span>}
                </span>
                <span className="data-sm mt-[4px] block text-secondary">{f.desc}</span>
              </button>
            );
          })}
        </div>

        <Divider />
        <span className="label-caps text-secondary">Include</span>
        <div className="data-sm flex flex-col gap-[7px]">
          {Object.entries(includes).map(([name, on]) => (
            <div key={name} className="flex items-center justify-between text-on-surface">
              <span>{name}</span>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setIncludes((s) => ({ ...s, [name]: !on }))}
                className={cn(
                  'data-sm rounded-control border px-[6px] py-px',
                  on ? 'border-primary text-primary' : 'border-border text-secondary',
                )}
              >
                {on ? 'on' : 'off'}
              </button>
            </div>
          ))}
        </div>

        <Divider />
        <div className="data-sm border border-border bg-neutral p-md leading-[1.7] text-secondary">
          preview
          <br />
          run {run.id} · {run.date} · analyst {run.user}
          <br />
          {summary} · {conf != null ? `${conf.toFixed(2)} ${band(conf)}` : 'no answer'}
          <br />
          sha256 4c1e…9ab2
        </div>

        <span className="flex-1" />
        <div className="flex gap-sm">
          <Button full disabled={generated} onClick={() => setGenerated(true)}>
            {generated ? 'Export generated · sha256 4c1e…9ab2' : 'Generate export'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
