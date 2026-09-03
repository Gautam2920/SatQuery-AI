import { cn } from '@/lib/cn';
import { band } from '@/data/runs';

/* Always three parts, never a bare bar: the mono value, a one-word qualitative
   band, and a segmented tick meter like a signal-strength readout. Below 0.5 the
   band label — and only the label — takes tertiary-strong. No red→green, ever. */
export function ConfidenceMeter({
  value,
  ticks = 10,
  label = 'Confidence',
  note,
  className,
}: {
  value: number;
  ticks?: number;
  label?: string;
  note?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const lit = Math.round(clamped * ticks);
  const low = clamped < 0.5;

  return (
    <div className={cn('flex flex-col gap-sm', className)}>
      <div className="flex items-baseline gap-md">
        <span className="data-lg text-on-surface">{clamped.toFixed(2)}</span>
        <span className={cn('label-caps', low ? 'text-tertiary-strong' : 'text-secondary')}>
          {band(clamped)}
        </span>
        <span className="flex-1" />
        <span className="label-caps text-secondary">{label}</span>
      </div>
      <div
        className="flex h-[6px] gap-[2px] rounded-none bg-[var(--meter-track)]"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={Number(clamped.toFixed(2))}
        aria-label={`${label}: ${clamped.toFixed(2)}, ${band(clamped)}`}
      >
        {Array.from({ length: ticks }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-[6px] flex-1 transition-colors duration-[var(--dur-state)]',
              i < lit ? 'bg-[var(--meter-fill)]' : 'bg-transparent',
            )}
          />
        ))}
      </div>
      {note && <span className="data-sm text-secondary">{note}</span>}
    </div>
  );
}
