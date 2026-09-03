import { useId } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfidenceMeter } from '@/components/ui/ConfidenceMeter';
import { ExecutionTrace } from '@/components/ui/ExecutionStage';
import { Icon } from '@/components/ui/Icon';
import { MetaValue } from '@/components/ui/MetaValue';
import { Overlay } from '@/components/ui/Overlay';
import { ProvenanceChip } from '@/components/ui/ProvenanceChip';
import { SectionHeader } from '@/components/ui/Panel';
import type { EvidenceRegion } from '@/data/types';

const CORNER = 'pointer-events-none absolute h-[12px] w-[12px] border-primary';

/* Evidence inspector (wireframe 1g) — one region and its working, over the
   canvas. Dimmed by tone, not blur. Shows how each measured value was produced. */
export function EvidenceInspector({
  region,
  onClose,
}: {
  region: EvidenceRegion;
  onClose: () => void;
}) {
  const titleId = useId();

  return (
    <Overlay onClose={onClose} labelledBy={titleId}>
      <div className="absolute bottom-[40px] left-[56px] right-[56px] top-[40px] flex flex-col overflow-hidden rounded-container border border-border bg-surface shadow-[var(--shadow-float)] max-[900px]:inset-[12px]">
        <header className="flex items-center gap-md border-b border-border px-lg py-[14px]">
          <span id={titleId} className="label-caps text-secondary">
            Evidence inspector
          </span>
          <span className="data-md text-on-surface">
            {region.id} · {region.className}
          </span>
          <ProvenanceChip kind={region.provenance} />
          <span className="flex-1" />
          <span className="data-sm flex items-center gap-sm text-secondary">
            esc
            <button
              type="button"
              onClick={onClose}
              aria-label="Close inspector"
              className="flex h-[24px] w-[24px] items-center justify-center rounded-control border border-border text-secondary hover:border-primary hover:text-primary"
            >
              <Icon name="x" size={12} />
            </button>
          </span>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[1fr_340px] max-[900px]:grid-cols-1 max-[900px]:auto-rows-min">
          <div className="flex flex-col border-r border-border max-[900px]:min-h-[200px] max-[900px]:border-b max-[900px]:border-r-0">
            <div className="data-sm relative flex-1 bg-neutral text-secondary">
              <span className="absolute left-[16px] top-[14px]">
                REGION CROP · letterboxed on neutral
              </span>
              <span className={`${CORNER} left-[10px] top-[10px] border-l border-t`} />
              <span className={`${CORNER} right-[10px] top-[10px] border-r border-t`} />
              <span className={`${CORNER} bottom-[10px] left-[10px] border-b border-l`} />
              <span className={`${CORNER} bottom-[10px] right-[10px] border-b border-r`} />
            </div>
            <div className="data-sm flex gap-sm border-t border-border px-[16px] py-[10px] text-secondary">
              <span className="text-primary">{region.bands.split(' ')[0] ?? 'true colour'}</span>
              <span>NDWI</span>
              <span>SAR VV</span>
              <span>mask only</span>
              <span className="flex-1" />
              <span>opacity 65%</span>
            </div>
          </div>

          <div className="gt-scroll flex flex-col overflow-y-auto">
            <div className="flex flex-col gap-[10px] border-b border-border px-lg py-[16px]">
              <MetaValue label="Area" value={region.area} tone="measured" />
              <MetaValue label="Perimeter" value={region.perimeter} tone="measured" />
              <MetaValue label="Centroid" value={region.centroid} tone="measured" />
              <MetaValue label="Bands" value={region.bands} />
              <ConfidenceMeter value={region.confidence} label="Region conf" />
            </div>
            <SectionHeader>How this value was produced</SectionHeader>
            <div className="px-lg">
              <ExecutionTrace
                stages={[
                  {
                    name: 'scene interpretation',
                    state: 'done',
                    duration: '2.1 s',
                    details: [
                      { label: 'model', value: 'flood-seg-v3' },
                      { label: 'threshold', value: '0.35' },
                    ],
                  },
                  {
                    name: 'geospatial computation',
                    state: 'done',
                    duration: '6.8 s',
                    defaultOpen: true,
                    details: [
                      { label: 'transform', value: 'ST_Transform → EPSG:32631' },
                      { label: 'intersect', value: 'ST_Intersection(mask, cropland)' },
                      { label: 'ST_Area', value: region.area, tone: 'measured' },
                    ],
                  },
                ]}
              />
            </div>
            <div className="flex flex-wrap gap-sm p-lg">
              <Button size="sm" variant="secondary" iconEnd="download">
                Download GeoJSON
              </Button>
              <Button size="sm" variant="secondary">
                Flag region
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
