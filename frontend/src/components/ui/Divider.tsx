import { cn } from '@/lib/cn';

/* Hairlines divide rows and zones; they do not wrap content into boxes. */
export function Divider({ label, className }: { label?: string; className?: string }) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-md', className)}>
        <span className="label-caps whitespace-nowrap text-secondary">{label}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    );
  }
  return <hr className={cn('h-px w-full flex-none border-0 bg-border', className)} />;
}
