import { cn } from '@/lib/cn';

type Tone = 'idle' | 'running' | 'done' | 'failed';

const TONE: Record<Tone, string> = {
  idle: 'bg-secondary',
  running: 'bg-primary',
  done: 'bg-verified',
  failed: 'bg-tertiary',
};

/* The only element in the system that uses radius-full. */
export function StatusDot({
  tone = 'idle',
  size = 8,
  pulse = false,
  className,
}: {
  tone?: Tone;
  size?: number;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn('block flex-none rounded-full', TONE[tone], className)}
      style={{
        width: size,
        height: size,
        animation: pulse ? 'gt-dot 1.6s var(--ease-out) infinite' : undefined,
      }}
    />
  );
}
