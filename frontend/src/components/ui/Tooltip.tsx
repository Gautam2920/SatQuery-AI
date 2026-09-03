import { useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* surface-raised, body-sm, 150ms delay in / instant out. Definitions only (CRS
   codes, band names, model names) — not primary information. This floats and can
   be dismissed, so it is one of the few shadowed surfaces. */
export function Tooltip({
  content,
  placement = 'top',
  children,
  className,
}: {
  content: ReactNode;
  placement?: 'top' | 'bottom' | 'right';
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const show = () => {
    timer.current = setTimeout(() => setOpen(true), 150);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };

  const pos =
    placement === 'bottom'
      ? 'top-[calc(100%+6px)] left-0'
      : placement === 'right'
        ? 'left-[calc(100%+6px)] top-0'
        : 'bottom-[calc(100%+6px)] left-0';

  return (
    <span
      className={cn(
        'relative inline-flex cursor-help border-b border-dotted border-secondary',
        className,
      )}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'body-sm absolute z-20 min-w-[160px] max-w-[280px] rounded-control border border-border bg-surface-raised px-md py-sm text-on-surface shadow-[var(--shadow-float)]',
            pos,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
