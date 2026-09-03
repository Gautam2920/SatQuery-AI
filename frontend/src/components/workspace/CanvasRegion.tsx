import { cn } from '@/lib/cn';
import type { EvidenceRegion } from '@/data/types';

/* Region outlines are drawn as registration brackets, never as filled shapes:
   the design must not fabricate a segmentation mask. */
export function CanvasRegion({
  region,
  active,
  onSelect,
}: {
  region: EvidenceRegion;
  active: boolean;
  onSelect: () => void;
}) {
  const color = active ? 'var(--primary)' : region.alert ? 'var(--tertiary)' : 'var(--secondary)';
  const b = `1px solid ${color}`;
  const arm = 'pointer-events-none absolute h-[13px] w-[13px]';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Region ${region.id}, ${region.className}, ${region.area}`}
      aria-pressed={active}
      className={cn('absolute cursor-pointer', active && 'z-10')}
      style={{
        left: region.box.left,
        right: region.box.right,
        top: region.box.top,
        bottom: region.box.bottom,
        width: region.box.width,
        height: region.box.height,
      }}
    >
      <span className={arm} style={{ top: 0, left: 0, borderTop: b, borderLeft: b }} />
      <span className={arm} style={{ top: 0, right: 0, borderTop: b, borderRight: b }} />
      <span className={arm} style={{ bottom: 0, left: 0, borderBottom: b, borderLeft: b }} />
      <span className={arm} style={{ bottom: 0, right: 0, borderBottom: b, borderRight: b }} />
      <span className="data-sm absolute left-0 top-[-16px] whitespace-nowrap" style={{ color }}>
        {region.id} · {region.area}
      </span>
    </button>
  );
}
