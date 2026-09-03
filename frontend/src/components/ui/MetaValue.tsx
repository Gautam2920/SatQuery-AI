import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

type Tone = 'default' | 'measured' | 'accent';

const TONE: Record<Tone, string> = {
  default: 'text-on-surface',
  measured: 'text-verified',
  accent: 'text-primary',
};

/* Label/value pair for coordinate readouts, CRS tags, band names, timestamps.
   The label is Archivo label-caps in secondary; the value is always Plex Mono. */
export function MetaValue({
  label,
  value,
  tone = 'default',
  align = 'row',
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: Tone;
  align?: 'row' | 'stack';
  className?: string;
}) {
  const stack = align === 'stack';
  return (
    <div
      className={cn(
        'flex gap-md',
        stack ? 'flex-col items-start gap-xs' : 'items-baseline justify-between',
        className,
      )}
    >
      <span className="label-caps whitespace-nowrap text-secondary">{label}</span>
      <span className={cn('data-md text-right', TONE[tone])}>{value}</span>
    </div>
  );
}

/** A key/value list where the key is a plain mono term (spec-list), not a caps
 *  label — used for transects, run metadata blocks. */
export function SpecRow({
  k,
  value,
  tone = 'default',
}: {
  k: ReactNode;
  value: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="flex items-baseline justify-between gap-md border-b border-border py-[3px] last:border-b-0">
      <span className="data-sm text-on-surface">{k}</span>
      <span className={cn('data-sm text-right', TONE[tone])}>{value}</span>
    </div>
  );
}
