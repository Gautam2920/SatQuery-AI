import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { RegistrationMark } from '@/components/ui/RegistrationMark';
import { RailPrototypeMarker } from '@/components/common/PrototypeBadge';
import type { LayoutMode } from '@/hooks/useLayoutMode';

const ITEMS = [
  { to: '/library', short: 'SCN', label: 'Scene library' },
  { to: '/workspace', short: 'RUN', label: 'Workspace' },
  { to: '/history', short: 'HIST', label: 'Run history' },
  { to: '/workspace?run=0f3a91&export=1', short: 'EXPT', label: 'Export a run' },
] as const;

export function NavRail({ layout }: { layout: LayoutMode }) {
  const horizontal = layout === 'column';

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
      <NavLink to="/" aria-label="SatQuery AI home" className="text-primary" title="SatQuery AI">
        <RegistrationMark size={20} color="var(--primary)" />
      </NavLink>

      {ITEMS.map((it) => (
        <NavLink
          key={it.short}
          to={it.to}
          aria-label={it.label}
          title={it.label}
          className={({ isActive }) =>
            cn(
              'label-caps tracking-[0.1em] no-underline transition-colors duration-[var(--dur-state)]',
              horizontal ? 'border-b-2 pb-[2px]' : '-ml-[9px] border-l-2 pl-[7px]',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-on-surface',
            )
          }
        >
          {it.short}
        </NavLink>
      ))}

      {horizontal ? (
        <span className="data-sm ml-auto tracking-[0.08em] text-secondary/80">PROTOTYPE</span>
      ) : (
        <RailPrototypeMarker />
      )}
    </nav>
  );
}
