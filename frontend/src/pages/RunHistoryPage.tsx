import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PageShell } from '@/components/workspace/PageShell';
import { RUNS } from '@/data/runs';

/* Wireframe 1i — every run reopenable with its trace intact. A run is immutable;
   re-running a query with edited parameters creates a new run linked to its
   parent. */
export function RunHistoryPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState('0f3a91');

  const go = (path: string) => navigate(path);

  return (
    <PageShell>
      <div className="gt-scroll flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-wrap items-center gap-[14px] border-b border-border p-[16px_24px]">
          <h1 className="headline-md text-[length:var(--text-body-lg-size)]">Run history</h1>
          <span className="data-sm text-secondary">62 runs · Delta Flood Program</span>
          <span className="flex-1" />
          <label className="data-sm flex h-[30px] w-[200px] items-center rounded-control border border-border bg-surface px-[10px] text-secondary">
            <span className="sr-only">Filter runs</span>
            <input
              type="search"
              placeholder="filter query, scene, user"
              className="w-full bg-transparent outline-none placeholder:text-secondary"
            />
          </label>
        </div>

        <table className="data-md w-full border-collapse px-[24px]">
          <caption className="sr-only">
            Run history — select a row, then reopen, compare or export
          </caption>
          <thead>
            <tr>
              {['Run', 'Query', 'Scene', 'Conf', 'Time', 'State'].map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={cn(
                    'label-caps border-b border-border px-[24px] py-[9px] text-secondary first:pl-[24px]',
                    i >= 3 ? 'text-right' : 'text-left',
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RUNS.map((r) => {
              const sel = r.id === selected;
              return (
                <tr
                  key={r.id}
                  tabIndex={0}
                  role="button"
                  aria-current={sel ? 'true' : undefined}
                  onClick={() => setSelected(r.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(r.id);
                    }
                  }}
                  className={cn(
                    'cursor-pointer transition-colors duration-[var(--dur-state)] hover:bg-surface-raised',
                    sel && 'bg-surface-raised',
                  )}
                >
                  <td
                    className={cn(
                      'border-b border-border px-[24px] py-[9px]',
                      sel ? 'text-primary' : 'text-secondary',
                    )}
                  >
                    {r.id}
                  </td>
                  <td className="border-b border-border px-[24px] py-[9px]">
                    <span className="body-sm">{r.query}</span>
                  </td>
                  <td className="border-b border-border px-[24px] py-[9px] text-secondary">
                    {r.sceneId}
                  </td>
                  <td className="border-b border-border px-[24px] py-[9px] text-right">
                    {r.confidence == null ? (
                      <span className="text-secondary">—</span>
                    ) : r.confidence < 0.5 ? (
                      <span className="inline-flex items-center justify-end gap-[3px] text-tertiary-strong">
                        <Icon name="alert" size={10} />
                        {r.confidence.toFixed(2)}
                      </span>
                    ) : (
                      r.confidence.toFixed(2)
                    )}
                  </td>
                  <td className="border-b border-border px-[24px] py-[9px] text-right text-secondary">
                    {r.elapsed}
                  </td>
                  <td className="border-b border-border px-[24px] py-[9px] text-right">
                    {r.state === 'failed' ? (
                      <span className="inline-flex items-center justify-end gap-[4px] text-tertiary-strong">
                        <Icon name="alert" size={11} />
                        failed
                      </span>
                    ) : (
                      <span className="text-verified">complete</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex flex-wrap gap-sm p-[16px_24px]">
          <Button size="sm" onClick={() => go(`/workspace?run=${selected}`)}>
            Reopen run
          </Button>
          <Button size="sm" variant="secondary" onClick={() => go('/compare')}>
            Compare two runs
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => go(`/workspace?run=${selected}&export=1`)}
          >
            Export selection
          </Button>
        </div>
        <p className="body-sm mx-[24px] max-w-[70ch] text-secondary">
          A run is immutable. Re-running a query with edited parameters creates a new run linked to
          its parent.
        </p>
      </div>
    </PageShell>
  );
}
