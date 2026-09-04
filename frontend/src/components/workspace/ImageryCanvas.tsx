import { cn } from '@/lib/cn';
import { ImageSlot } from '@/components/common/ImageSlot';
import { ProvenanceChip } from '@/components/ui/ProvenanceChip';
import { CanvasRegion } from './CanvasRegion';
import type { EvidenceRegion, Scene } from '@/data/types';
import type { PipelineStatus } from '@/hooks/useRunPipeline';

const CORNER = 'pointer-events-none absolute h-[12px] w-[12px]';

export function ImageryCanvas({
  scene,
  regions,
  selectedId,
  onSelect,
  status,
  previewUrl,
  modelLabel,
}: {
  scene: Scene;
  regions: EvidenceRegion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  status: PipelineStatus;
  /** rendered true-colour PNG of exactly the tile the backend analysed */
  previewUrl?: string;
  modelLabel?: string;
}) {
  const running = status === 'running';
  const markColor = running ? 'var(--primary)' : 'var(--secondary)';
  const b = (sides: string[]) =>
    Object.fromEntries(sides.map((s) => [s, `1px solid ${markColor}`]));

  // shown only while running / halted — in the answer state the drawn region
  // boxes and the provenance chips already say what the canvas holds.
  const note = running
    ? previewUrl
      ? 'running Prithvi encoder on the backend…'
      : 'computing inundation mask…'
    : status === 'failure'
      ? 'SCENE · chain halted before a mask was drawn'
      : null;

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-neutral">
      {/* instrument chrome — coordinate readout, bands, CRS */}
      <div className="data-sm flex h-[36px] flex-none items-center gap-md border-b border-border px-[14px] text-secondary">
        <span className="text-on-surface">{scene.id}</span>
        <span className="h-[14px] w-px bg-border" />
        <span>
          {scene.kind === 'sar'
            ? `SAR ${scene.polarisation ?? 'VV+VH'}`
            : 'true colour · B04 B03 B02'}
        </span>
        <span className="flex-1" />
        {status === 'answer' && regions.length > 0 && (
          <>
            <span>regions {regions.length}</span>
            <span className="h-[14px] w-px bg-border" />
          </>
        )}
        <span>48.8123°N 2.0311°E</span>
        <span className="h-[14px] w-px bg-border" />
        <span>{scene.crs}</span>
      </div>

      <div className="relative min-h-[280px] flex-1 bg-neutral">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={`True-colour render of the analysed tile of ${scene.id}`}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <ImageSlot
            label="SCENE · placeholder imagery, inset flush — drop a GeoTIFF / COG"
            hideLabel={status !== 'idle'}
          />
        )}

        {/* corner registration brackets */}
        <span className={CORNER} style={{ top: 10, left: 10, ...b(['borderTop', 'borderLeft']) }} />
        <span
          className={CORNER}
          style={{ top: 10, right: 10, ...b(['borderTop', 'borderRight']) }}
        />
        <span
          className={CORNER}
          style={{ bottom: 10, left: 10, ...b(['borderBottom', 'borderLeft']) }}
        />
        <span
          className={CORNER}
          style={{ bottom: 10, right: 10, ...b(['borderBottom', 'borderRight']) }}
        />

        {/* north tick */}
        <div className="pointer-events-none absolute left-[26px] top-[20px] flex flex-col items-center gap-[2px]">
          <span className="data-sm text-secondary">N</span>
          <span className="h-[16px] w-px bg-secondary" />
        </div>

        {/* chrome note top-left (nothing centered) — the dynamic state line;
            when idle the ImageSlot shows its own drop label in this spot */}
        {note && (
          <span
            className={cn(
              'data-sm pointer-events-none absolute left-[16px] top-[14px] max-w-[60%] tracking-[0.04em]',
              running ? 'text-primary-strong' : 'text-secondary',
            )}
          >
            {note}
          </span>
        )}

        {/* grounded regions (answer state only) */}
        {status === 'answer' &&
          regions.map((r) => (
            <CanvasRegion
              key={r.id}
              region={r}
              active={selectedId === r.id}
              onSelect={() => onSelect(r.id)}
            />
          ))}

        {/* scale bar bottom-left */}
        <div className="pointer-events-none absolute bottom-[16px] left-[16px] flex items-center gap-sm">
          <span className="relative block h-px w-[64px] bg-secondary">
            <span className="absolute left-0 top-[-3px] h-[7px] w-px bg-secondary" />
            <span className="absolute right-0 top-[-3px] h-[7px] w-px bg-secondary" />
          </span>
          <span className="data-sm text-secondary">2 km</span>
          <span className="data-sm text-secondary">· {scene.gsd}</span>
        </div>

        {/* provenance chips bottom-right (answer state) */}
        {status === 'answer' && regions.length > 0 && (
          <div className="absolute bottom-[14px] right-[16px] flex gap-sm">
            <ProvenanceChip kind="interpreted">
              {regions.length} regions · {modelLabel ?? 'flood-seg-v3'}
            </ProvenanceChip>
            <ProvenanceChip kind="measured">
              areas · {previewUrl ? 'rasterio + shapely' : 'PostGIS'}
            </ProvenanceChip>
          </div>
        )}
      </div>
    </main>
  );
}
