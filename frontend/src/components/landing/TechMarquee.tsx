import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TECH_ITEMS } from '@/data/landing';

const NORMAL_VELOCITY = 44; // px/s at rest
const SLOW_VELOCITY = 10; // px/s while the pointer is over the strip
const RAMP = 6; // per-second lerp factor toward the target velocity

/* The technology marquee (wireframe 1a): the stack under the answer, auto-
   scrolling. Hovering the strip eases it down to a crawl; hovering or focusing an
   item stops it and reveals that item's name + info line beneath. Driven by
   requestAnimationFrame so the speed change is smooth (a CSS `animation-duration`
   swap would restart the loop). Reduced motion → a static, scrollable strip.
   The strip owns no wheel handler, so it never fights page scroll. */
export function TechMarquee() {
  const reducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);
  const pointerOver = useRef(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const velocity = useRef(NORMAL_VELOCITY);
  const raf = useRef(0);
  const hoveredRef = useRef<number | null>(null);
  hoveredRef.current = hovered;

  const tick = useCallback((prev: number, now: number) => {
    const dt = Math.min((now - prev) / 1000, 0.05);
    const target =
      hoveredRef.current != null ? 0 : pointerOver.current ? SLOW_VELOCITY : NORMAL_VELOCITY;
    velocity.current += (target - velocity.current) * Math.min(RAMP * dt, 1);

    const track = trackRef.current;
    if (track) {
      const half = track.scrollWidth / 2 || 1;
      offset.current = (offset.current - velocity.current * dt) % half;
      track.style.transform = `translateX(${offset.current}px)`;
    }
    raf.current = requestAnimationFrame((t) => tick(now, t));
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    raf.current = requestAnimationFrame((t) => tick(t, t));
    return () => cancelAnimationFrame(raf.current);
  }, [reducedMotion, tick]);

  const active = hovered != null ? TECH_ITEMS[hovered] : null;

  const cell = (item: (typeof TECH_ITEMS)[number], index: number, duplicate: boolean) => (
    <button
      key={`${duplicate ? 'b' : 'a'}-${index}`}
      type="button"
      tabIndex={duplicate ? -1 : 0}
      aria-hidden={duplicate || undefined}
      aria-label={duplicate ? undefined : `${item.name} — ${item.info}`}
      onMouseEnter={() => !duplicate && setHovered(index)}
      onMouseLeave={() => !duplicate && setHovered(null)}
      onFocus={() => !duplicate && setHovered(index)}
      onBlur={() => !duplicate && setHovered(null)}
      className={cn(
        'flex h-[80px] w-[92px] flex-none items-center justify-center border-r border-border',
        'text-secondary transition-colors duration-[var(--dur-state)]',
        'hover:bg-[var(--glass-cell-hover)] hover:text-primary-ink',
        'focus-visible:bg-[var(--glass-cell-hover)] focus-visible:text-primary-ink',
      )}
    >
      <Icon name={item.icon as IconName} size={20} />
    </button>
  );

  return (
    <div className="flex w-full flex-col gap-[6px]">
      <div
        role="group"
        aria-label="Technology stack — auto-scrolling; hover or focus an item for detail"
        className="relative w-full overflow-hidden border border-border bg-[var(--glass)] [backdrop-filter:blur(6px)_saturate(1.04)]"
        onMouseEnter={() => (pointerOver.current = true)}
        onMouseLeave={() => {
          pointerOver.current = false;
          setHovered(null);
        }}
      >
        {reducedMotion ? (
          <div className="gt-scroll flex w-full overflow-x-auto">
            {TECH_ITEMS.map((t, i) => cell(t, i, false))}
          </div>
        ) : (
          <div ref={trackRef} className="flex w-max will-change-transform">
            {TECH_ITEMS.map((t, i) => cell(t, i, false))}
            {TECH_ITEMS.map((t, i) => cell(t, i, true))}
          </div>
        )}
      </div>

      <p
        aria-live="polite"
        className="flex min-h-[22px] w-full items-baseline gap-md border-b border-border pb-[6px]"
      >
        <span className="data-sm text-primary-ink">{active ? active.name : 'hover a glyph'}</span>
        <span className="data-sm text-secondary">
          {active
            ? active.info
            : 'twelve components · interpretation and calculation kept separate'}
        </span>
      </p>
    </div>
  );
}
