import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { RegistrationMark } from '@/components/ui/RegistrationMark';
import { RailPrototypeMarker } from '@/components/common/PrototypeBadge';
import type { LayoutMode } from '@/hooks/useLayoutMode';

const DEMO_EXPORT_RUN_ID = '0f3a91';

type RailItem = {
  short: string;
  label: string;
  path: string;
  /** Set on the one item that opens the export slide-over rather than a page. */
  opensExport?: boolean;
};

const RAIL_ITEMS: RailItem[] = [
  { short: 'SCN', label: 'Scene library', path: '/library' },
  { short: 'RUN', label: 'Workspace', path: '/workspace' },
  { short: 'HIST', label: 'Run history', path: '/history' },
  { short: 'EXPT', label: 'Export a run', path: '/workspace', opensExport: true },
];

/** The export rail item is a mode of the workspace, not a separate page, so its
 *  active state hangs off `?export=1` rather than the pathname alone. NavLink
 *  compares pathnames only, which is why it cannot express this. */
function isRailItemActive(item: RailItem, pathname: string, exportIsOpen: boolean): boolean {
  if (pathname !== item.path) return false;
  if (item.path !== '/workspace') return true;

  return exportIsOpen === Boolean(item.opensExport);
}

/** Opening the export keeps whatever run the workspace is already showing; it
 *  only falls back to the authored demo run when there is nothing loaded. */
function railItemTarget(item: RailItem, pathname: string, search: string): string {
  if (!item.opensExport) return item.path;

  if (pathname === '/workspace') {
    const params = new URLSearchParams(search);
    params.set('export', '1');
    return `/workspace?${params.toString()}`;
  }

  return `/workspace?run=${DEMO_EXPORT_RUN_ID}&export=1`;
}

export function NavRail({ layout }: { layout: LayoutMode }) {
  const { pathname, search } = useLocation();
  const horizontal = layout === 'column';
  const exportIsOpen = new URLSearchParams(search).get('export') === '1';

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'flex flex-none border-border',
        horizontal
          ? 'items-center gap-lg border-b px-gutter py-sm'
          : 'w-[var(--rail-collapsed)] flex-col items-center gap-[14px] border-r py-[14px]',
      )}
    >
      <Link to="/" aria-label="SatQuery AI home" className="text-primary" title="SatQuery AI">
        <RegistrationMark size={20} color="var(--primary)" />
      </Link>

      {RAIL_ITEMS.map((item) => {
        const active = isRailItemActive(item, pathname, exportIsOpen);

        return (
          <Link
            key={item.short}
            to={railItemTarget(item, pathname, search)}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            title={item.label}
            className={cn(
              'label-caps tracking-[0.1em] no-underline transition-colors duration-[var(--dur-state)]',
              horizontal ? 'border-b-2 pb-[2px]' : '-ml-[9px] border-l-2 pl-[7px]',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-on-surface',
            )}
          >
            {item.short}
          </Link>
        );
      })}

      {horizontal ? (
        <span className="data-sm ml-auto tracking-[0.08em] text-secondary/80">PROTOTYPE</span>
      ) : (
        <RailPrototypeMarker />
      )}
    </nav>
  );
}
