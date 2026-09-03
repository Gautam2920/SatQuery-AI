/* Groundtruth icon set — geometry from Lucide (ISC), 24×24 grid, 1.5px stroke.
   Ported verbatim from _ds_bundle.js (components/core/Icon.jsx).
   Icons inherit currentColor and never carry meaning alone. */

export const GT_ICONS = {
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18 M6 6l12 12',
  'chevron-right': 'm9 18 6-6-6-6',
  'chevron-down': 'm6 9 6 6 6-6',
  'arrow-right': 'M5 12h14 M12 5l7 7-7 7',
  plus: 'M5 12h14 M12 5v14',
  minus: 'M5 12h14',
  alert:
    'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z M12 9v4 M12 17h.01',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 16v-4 M12 8h.01',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 6v6l4 2',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z M21 21l-4.3-4.3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  crosshair: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M22 12h-4 M6 12H2 M12 6V2 M12 22v-4',
  cpu: 'M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z M9 9h6v6H9z M9 1v3 M15 1v3 M9 20v3 M15 20v3 M20 9h3 M20 14h3 M1 9h3 M1 14h3',
  compare:
    'M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M13 6H7a2 2 0 0 0-2 2v7 M11 18h6a2 2 0 0 0 2-2V9',
  image:
    'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z M21 15l-5-5L5 21',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  'map-pin': 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  list: 'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
  expand: 'M15 3h6v6 M9 21H3v-6 M21 3l-7 7 M3 21l7-7',
  layers: 'M12 2 2 7l10 5 10-5-10-5Z M2 17l10 5 10-5 M2 12l10 5 10-5',
} as const;

export type IconName = keyof typeof GT_ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function Icon({ name, size = 14, strokeWidth = 1.5, className }: IconProps) {
  const d = GT_ICONS[name];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: 'block', flex: 'none' }}
    >
      {d.split(/\s+(?=[Mm])/).map((seg, i) => (
        <path key={i} d={seg} />
      ))}
    </svg>
  );
}
