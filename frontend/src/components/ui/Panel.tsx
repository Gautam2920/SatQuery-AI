import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

/* A panel is not a floating object; it is a slightly lit region of the same
   console. Never elevated, never shadowed. 6px radius, hairline border. */
export function Panel({
  title,
  meta,
  action,
  collapsible = false,
  defaultOpen = true,
  flush = false,
  children,
  className,
}: {
  title?: string;
  meta?: ReactNode;
  action?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  flush?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <section
      className={cn(
        'flex-none overflow-hidden rounded-container border border-border bg-surface',
        className,
      )}
    >
      {title && (
        <header
          className={cn('flex items-center gap-sm px-lg py-md', open && 'border-b border-border')}
        >
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls={bodyId}
              className="flex flex-1 items-center gap-sm text-left"
            >
              <Icon
                name="chevron-down"
                size={14}
                className={cn(
                  'text-secondary transition-transform duration-[var(--dur-state)]',
                  !open && '-rotate-90',
                )}
              />
              <span className="label-caps flex-1 text-secondary">{title}</span>
            </button>
          ) : (
            <h2 className="label-caps flex-1 text-secondary">{title}</h2>
          )}
          {meta && <span className="data-sm text-secondary">{meta}</span>}
          {action}
        </header>
      )}
      {open && (
        <div id={bodyId} className={flush ? undefined : 'p-lg'}>
          {children}
        </div>
      )}
    </section>
  );
}

/** Flat section header used in the evidence column (wireframe 1f) — a label-caps
 *  line above a hairline-separated block, no card wrapper. */
export function SectionHeader({ children, meta }: { children: ReactNode; meta?: ReactNode }) {
  return (
    <div className="flex items-baseline gap-sm px-lg pb-[6px] pt-md">
      <span className="label-caps flex-1 text-secondary">{children}</span>
      {meta && <span className="data-sm text-secondary">{meta}</span>}
    </div>
  );
}
