import type { ReactNode } from 'react';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import { NavRail } from './NavRail';

/* Rail-bearing shell for the library, history and compare screens. The workspace
   itself uses WorkspaceShell (three-zone). Below 760px the rail goes horizontal
   and the page becomes a single scrolling column. */
export function PageShell({ children }: { children: ReactNode }) {
  const layout = useLayoutMode();
  const column = layout === 'column';

  return (
    <div
      className={
        column
          ? 'flex min-h-full flex-col bg-neutral text-on-surface'
          : 'flex h-full overflow-hidden bg-neutral text-on-surface'
      }
    >
      <NavRail layout={layout} />
      <div className={column ? 'flex flex-1 flex-col' : 'flex min-w-0 flex-1 overflow-hidden'}>
        {children}
      </div>
    </div>
  );
}
