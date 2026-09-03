import type { ReactNode } from 'react';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import { NavRail } from './NavRail';

function DegradedNote() {
  return (
    <div className="label-caps flex items-center gap-sm border-b border-border bg-surface px-lg py-sm text-secondary">
      Degraded view — SatQuery AI is a desktop instrument
    </div>
  );
}

/* The fixed three-zone shell on `neutral`. Below 1100px the evidence column
   drops beneath the canvas; below 760px it is a single scrolling column and an
   explicitly degraded view. Below the shell's 1256px floor the row scrolls
   horizontally rather than clipping a zone. */
export function WorkspaceShell({
  context,
  canvas,
  evidence,
}: {
  context: ReactNode;
  canvas: ReactNode;
  evidence: ReactNode;
}) {
  const layout = useLayoutMode();

  if (layout === 'column') {
    return (
      <div className="flex min-h-full flex-col bg-neutral text-on-surface">
        <NavRail layout={layout} />
        <DegradedNote />
        <div className="flex min-h-[320px] flex-col">{canvas}</div>
        {context}
        {evidence}
      </div>
    );
  }

  if (layout === 'stacked') {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-neutral text-on-surface">
        <NavRail layout={layout} />
        <DegradedNote />
        <div className="flex flex-1 overflow-hidden">
          {context}
          <div className="gt-scroll flex min-w-0 flex-1 flex-col overflow-y-auto">
            <div className="flex min-h-[360px] flex-col">{canvas}</div>
            <div className="flex border-t border-border">{evidence}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gt-scroll h-full overflow-x-auto overflow-y-hidden bg-neutral text-on-surface">
      <div className="flex h-full min-w-[var(--shell-floor)]">
        <NavRail layout={layout} />
        {context}
        {canvas}
        {evidence}
      </div>
    </div>
  );
}
