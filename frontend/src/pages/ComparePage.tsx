import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { ConfidenceMeter } from '@/components/ui/ConfidenceMeter';
import { Divider } from '@/components/ui/Divider';
import { MetaValue, SpecRow } from '@/components/ui/MetaValue';
import { ChangeBadge, ProvenanceChip } from '@/components/ui/ProvenanceChip';
import { RegistrationBrackets } from '@/components/ui/RegistrationMark';
import { StaticQuery } from '@/components/ui/QueryInput';
import { InlineValue } from '@/components/ui/AnswerBlock';
import { PageShell } from '@/components/workspace/PageShell';

const MODES = ['split', 'swipe', 'flicker', 'diff only'];
const PASSES = [
  { id: 'A', line: 'A · S2A_20190803', sub: '2019-08-03 10:38Z · optical' },
  { id: 'B', line: 'B · S2A_20240712', sub: '2024-07-12 10:41Z · optical' },
  { id: "B'", line: 'B′ · S1A_20240711', sub: 'SAR VV+VH · fused with B' },
];

/* Wireframe 1h — change detection + SAR/optical fusion. Carries a ROADMAP
   callout: the capability is not wired; figures are representative (DESIGN.md
   requires these to appear as roadmap surfaces only, never as a live result). */
export function ComparePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(0);
  const [active, setActive] = useState<Record<string, boolean>>({ B: true });

  return (
    <PageShell>
      {/* context */}
      <aside className="gt-scroll flex w-[var(--col-context)] flex-none flex-col gap-md overflow-y-auto border-r border-border bg-neutral p-lg max-[1100px]:w-full max-[1100px]:border-b max-[1100px]:border-r-0">
        <span className="label-caps text-secondary">Query</span>
        <StaticQuery>Has the shoreline retreated since 2019?</StaticQuery>
        <Divider />
        <span className="label-caps text-secondary">Passes</span>
        {PASSES.map((p) => {
          const on = active[p.id] ?? false;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => setActive((s) => ({ ...s, [p.id]: !on }))}
              className={cn(
                'data-sm rounded-control border p-[8px_10px] text-left leading-[1.6] text-secondary',
                on ? 'border-primary' : 'border-border',
              )}
            >
              {p.line}
              <br />
              {p.sub}
            </button>
          );
        })}
        <MetaValue label="Co-reg RMSE" value="0.6 px" tone="measured" />
      </aside>

      {/* canvas */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="data-sm flex h-[34px] flex-none items-center gap-md border-b border-border px-[14px] text-secondary">
          {MODES.map((m, i) => (
            <button
              key={m}
              type="button"
              aria-pressed={i === mode}
              onClick={() => setMode(i)}
              className={cn(
                'data-sm rounded-control border px-[7px] py-[2px]',
                i === mode ? 'border-primary text-primary' : 'border-border',
              )}
            >
              {m}
            </button>
          ))}
          <span className="flex-1" />
          <span>synced pan/zoom</span>
        </div>
        <RegistrationBrackets className="flex min-h-[360px] flex-1">
          <div className="flex flex-1">
            <div className="data-sm relative flex-1 border-r border-border bg-neutral text-secondary">
              <span className="absolute left-[16px] top-[14px]">
                PASS A · 2019 — placeholder imagery
              </span>
              <span className="absolute bottom-[12px] left-[12px]">A · 2019-08-03</span>
            </div>
            <div className="data-sm relative flex-1 bg-neutral text-secondary">
              <span className="absolute left-[16px] top-[14px]">
                PASS B · 2024 + SAR — placeholder imagery
              </span>
              <span className="absolute bottom-[12px] left-[12px]">B · 2024-07-12</span>
              <div className="absolute left-[22%] top-[34%] h-[110px] w-[180px]">
                <span className="absolute left-0 top-0 h-[12px] w-[12px] border-l border-t border-tertiary" />
                <span className="absolute right-0 top-0 h-[12px] w-[12px] border-r border-t border-tertiary" />
                <span className="absolute bottom-0 left-0 h-[12px] w-[12px] border-b border-l border-tertiary" />
                <span className="absolute bottom-0 right-0 h-[12px] w-[12px] border-b border-r border-tertiary" />
                <span className="data-sm absolute left-0 top-[-16px] whitespace-nowrap text-tertiary">
                  retreat front
                </span>
              </div>
            </div>
          </div>
        </RegistrationBrackets>
      </div>

      {/* evidence */}
      <aside className="gt-scroll flex w-[var(--col-evidence)] flex-none flex-col gap-[14px] overflow-y-auto border-l border-border bg-neutral p-lg max-[1100px]:w-full max-[1100px]:border-l-0 max-[1100px]:border-t">
        <Callout tone="roadmap" title="Bi-temporal change detection & SAR/optical fusion">
          This is the result surface these capabilities will use. The figures below are
          representative — live change runs are not wired in this prototype.
        </Callout>

        <div className="flex flex-wrap gap-xs">
          <ChangeBadge>changed</ChangeBadge>
          <ProvenanceChip kind="measured" />
        </div>
        <p className="body-lg text-pretty text-on-surface">
          The shoreline retreated a mean of <InlineValue tone="measured">18.4 m</InlineValue> along
          a <InlineValue tone="measured">4.2 km</InlineValue> front. Two segments advanced.
        </p>
        <ConfidenceMeter value={0.76} />
        <Divider />
        <span className="label-caps text-secondary">Transects</span>
        <div className="data-sm flex flex-col">
          <SpecRow k="T1" value="-24.1 m" tone="measured" />
          <SpecRow k="T2" value="-19.6 m" tone="measured" />
          <SpecRow k="T3" value="+3.2 m" tone="measured" />
        </div>
        <p className="body-sm text-secondary">
          SAR contributes the water boundary where cloud obscures pass B.
        </p>
        <div className="flex flex-wrap gap-sm">
          <Button size="sm" onClick={() => navigate('/history')}>
            Run history
          </Button>
          <Button size="sm" variant="secondary" onClick={() => navigate('/workspace')}>
            Back to workspace
          </Button>
        </div>
      </aside>
    </PageShell>
  );
}
