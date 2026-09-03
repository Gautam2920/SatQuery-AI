import { cn } from '@/lib/cn';

/* DESIGN.md prototype honesty: the design must never render fabricated analysis
   as real. Rail pages carry a vertical PROTOTYPE marker in the nav rail; the
   landing says so in its footer; the bare auth screen carries this fixed note. */
export function PrototypeBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'data-sm pointer-events-none fixed bottom-[6px] left-1/2 z-50 -translate-x-1/2',
        'rounded-control border border-border bg-surface px-sm py-[3px] tracking-[0.04em] text-secondary',
        className,
      )}
    >
      prototype · representative data, no analysis is run
    </div>
  );
}

export function RailPrototypeMarker() {
  return (
    <span
      className="data-sm mt-auto text-secondary/80"
      style={{ writingMode: 'vertical-rl', letterSpacing: '0.08em' }}
    >
      PROTOTYPE
    </span>
  );
}
