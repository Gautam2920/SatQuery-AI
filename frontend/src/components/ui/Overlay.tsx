import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/* Transient surface (evidence inspector 1g, export slide-over 1j). Dimmed by
   tone, not blur (DESIGN.md). Escape and outside-click dismiss; focus is trapped
   while open and restored to the trigger on close. */
export function Overlay({
  onClose,
  labelledBy,
  children,
  className,
  align = 'center',
}: {
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  className?: string;
  align?: 'center' | 'end';
}) {
  const scrimRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (n) => n.offsetParent !== null,
        );
        if (nodes.length === 0) return;
        const first = nodes[0]!;
        const last = nodes[nodes.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose],
  );

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKey, true);

    // move focus into the dialog
    const target = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? dialogRef.current;
    target?.focus();

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', handleKey, true);
      restoreRef.current?.focus?.();
    };
  }, [handleKey]);

  return (
    <div
      ref={scrimRef}
      className={cn(
        'fixed inset-0 z-40 flex items-stretch',
        align === 'end' ? 'justify-end' : 'justify-center',
      )}
      style={{ background: 'var(--overlay-scrim)' }}
      onMouseDown={(e) => {
        if (e.target === scrimRef.current) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn('outline-none', className)}
      >
        {children}
      </div>
    </div>
  );
}
