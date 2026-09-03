import { useEffect, useState } from 'react';

/** The brief's Layout rules, implemented literally:
 *   >= 1100px   three-zone shell
 *   760–1099    the evidence column drops beneath the canvas
 *   < 760       a single scrolling column, explicitly a degraded view
 */
export type LayoutMode = 'shell' | 'stacked' | 'column';

function read(): LayoutMode {
  if (typeof window === 'undefined') return 'shell';
  const w = window.innerWidth;
  if (w < 760) return 'column';
  if (w < 1100) return 'stacked';
  return 'shell';
}

export function useLayoutMode(): LayoutMode {
  const [mode, setMode] = useState<LayoutMode>(read);

  useEffect(() => {
    const on = () => setMode(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  return mode;
}
