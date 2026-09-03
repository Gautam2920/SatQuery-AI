import { useState } from 'react';
import { cn } from '@/lib/cn';
import { LinkButton } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Divider';
import { MetaValue } from '@/components/ui/MetaValue';
import { RegistrationBrackets } from '@/components/ui/RegistrationMark';
import { ImageSlot } from '@/components/common/ImageSlot';
import { PageShell } from '@/components/workspace/PageShell';
import { SCENES } from '@/data/scenes';

const FILTERS = ['optical', 'sar', '< 20% cloud', '2024'];
const LAYERS = ['true colour', 'NIR / B08', 'NDWI', 'SAR VV (S1, 11 Jul)', 'cropland mask'];

/* Wireframe 1c — imagery + layer selection. Selecting a scene updates the detail
   bar, canvas header and the metadata sidebar. */
export function SceneLibraryPage() {
  const [selectedId, setSelectedId] = useState(SCENES[0]!.id);
  const [filters, setFilters] = useState<Record<string, boolean>>({ optical: true });
  const [layers, setLayers] = useState<Record<string, boolean>>({ 'true colour': true });

  const scene = SCENES.find((s) => s.id === selectedId)!;

  return (
    <PageShell>
      {/* scene list */}
      <div className="flex w-[320px] flex-none flex-col border-r border-border max-[760px]:w-full max-[760px]:border-b max-[760px]:border-r-0">
        <div className="flex flex-col gap-md border-b border-border p-[14px_16px]">
          <span className="label-caps text-secondary">Scene library</span>
          <label className="data-sm flex h-[32px] items-center rounded-control border border-border bg-surface px-[10px] text-secondary">
            <span className="sr-only">Search scenes</span>
            <input
              type="search"
              placeholder="search aoi, sensor, date"
              className="w-full bg-transparent outline-none placeholder:text-secondary"
            />
          </label>
          <div className="flex flex-wrap gap-[6px]">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filters[f] ?? false}
                onClick={() => setFilters((s) => ({ ...s, [f]: !s[f] }))}
                className={cn(
                  'data-sm rounded-control border px-[7px] py-[3px]',
                  filters[f] ? 'border-primary text-primary' : 'border-border text-secondary',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="gt-scroll flex-1 overflow-y-auto">
          <ul>
            {SCENES.map((s) => {
              const sel = s.id === selectedId;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    aria-current={sel ? 'true' : undefined}
                    className={cn(
                      'flex w-full gap-[10px] border-b border-l-2 border-border p-[10px_16px] text-left transition-colors duration-[var(--dur-state)] hover:bg-surface-raised',
                      sel ? 'border-l-primary bg-surface-raised' : 'border-l-transparent',
                    )}
                  >
                    <span className="h-[44px] w-[56px] flex-none border border-border bg-neutral" />
                    <span>
                      <span className="data-sm block text-on-surface">{s.id}</span>
                      <span className="data-sm mt-[3px] block text-secondary">
                        {s.pass} · {s.gsd} · {s.cloud ?? s.polarisation}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-col gap-sm border-b border-border p-[12px_16px]">
            <span className="label-caps text-secondary">Upload</span>
            <div className="data-sm flex h-[64px] items-center justify-center rounded-control border border-dashed border-border text-secondary">
              drop GeoTIFF / COG · or connect STAC
            </div>
          </div>
        </div>
      </div>

      {/* detail */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="data-sm flex h-[40px] flex-none items-center gap-[14px] border-b border-border px-[16px] text-secondary">
          <span className="text-on-surface">{scene.id}</span>
          <span>
            {scene.crs} · {scene.gsd}
          </span>
          <span className="flex-1" />
          <LinkButton to={`/workspace?scene=${encodeURIComponent(scene.id)}`} size="sm">
            Open in workspace
          </LinkButton>
        </div>
        <div className="relative flex min-h-[360px] flex-1">
          <RegistrationBrackets style={{ position: 'absolute', inset: 0 }}>
            <ImageSlot label="FOOTPRINT PREVIEW · placeholder imagery — drop a GeoTIFF / COG to replace" />
          </RegistrationBrackets>
          <span className="data-sm pointer-events-none absolute bottom-[12px] left-[16px] text-secondary">
            48.812°N · 2.031°E &nbsp;|&nbsp; ——— 2 km
          </span>
        </div>
      </div>

      {/* aside */}
      <aside className="gt-scroll flex w-[260px] flex-none flex-col gap-md overflow-y-auto border-l border-border p-[14px_16px] max-[760px]:w-full max-[760px]:border-l-0 max-[760px]:border-t">
        <span className="label-caps text-secondary">Layers</span>
        <div className="data-sm flex flex-col gap-[7px]">
          {LAYERS.map((l) => {
            const on = layers[l] ?? false;
            return (
              <div key={l} className="flex items-center justify-between text-on-surface">
                <span>{l}</span>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setLayers((s) => ({ ...s, [l]: !on }))}
                  className={cn(
                    'data-sm rounded-control border px-[6px] py-px',
                    on ? 'border-primary text-primary' : 'border-border text-secondary',
                  )}
                >
                  {on ? 'on' : 'off'}
                </button>
              </div>
            );
          })}
        </div>
        <Divider />
        <MetaValue label="Sensor" value={scene.sensor} />
        <MetaValue label="Pass" value={scene.pass} />
        <MetaValue label="GSD" value={scene.gsd} tone="measured" />
        <MetaValue label="Extent" value={scene.extent} tone="measured" />
        <p className="body-sm text-secondary">
          Selecting a second pass enables change detection and SAR/optical fusion.{' '}
          <LinkButton to="/compare" variant="secondary" size="sm" className="mt-xs">
            Open the A/B pair
          </LinkButton>
        </p>
      </aside>
    </PageShell>
  );
}
