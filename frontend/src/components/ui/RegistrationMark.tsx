import type { CSSProperties, ReactNode } from 'react';

/* The mark: an L-bracket with one short inward tick — what a cartographer draws
   to align two overlays. Framing, focus, and the act of registering one image
   against another (which is what change detection is). */
export function RegistrationMark({
  size = 24,
  color = 'var(--primary)',
  strokeWidth = 1.5,
  className,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      aria-hidden="true"
      className={className}
      style={{ display: 'block', flex: 'none' }}
    >
      <path d="M3 15V3h12" />
      <path d="M3 9h5" />
    </svg>
  );
}

/* The mark repeated: 12px corner brackets around the canvas or an evidence
   region. Never a full rectangle — always just the corners. Switches to
   `primary` when the framed region is the active selection. */
export function RegistrationBrackets({
  active = false,
  inset = 6,
  length = 'var(--bracket-size)',
  thickness = 1,
  color,
  children,
  className,
  style,
}: {
  active?: boolean;
  inset?: number;
  length?: string;
  thickness?: number;
  color?: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const c = color ?? (active ? 'var(--mark-registration-active)' : 'var(--mark-registration)');
  const b = `${thickness}px solid ${c}`;
  const base: CSSProperties = {
    position: 'absolute',
    width: length,
    height: length,
    pointerEvents: 'none',
    transition: 'border-color var(--dur-state) var(--ease-state)',
  };
  // `position: relative` unless the caller's style overrides it (e.g. an
  // `inset: 0` fill layer). The corner spans anchor to whichever it resolves to.
  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      {children}
      <span style={{ ...base, top: inset, left: inset, borderTop: b, borderLeft: b }} />
      <span style={{ ...base, top: inset, right: inset, borderTop: b, borderRight: b }} />
      <span style={{ ...base, bottom: inset, left: inset, borderBottom: b, borderLeft: b }} />
      <span style={{ ...base, bottom: inset, right: inset, borderBottom: b, borderRight: b }} />
    </div>
  );
}
