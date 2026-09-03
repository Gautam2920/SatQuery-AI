import { AnswerBlock } from '@/components/ui/AnswerBlock';
import { ConfidenceMeter } from '@/components/ui/ConfidenceMeter';
import { ExecutionTrace } from '@/components/ui/ExecutionStage';
import { ProvenanceChip } from '@/components/ui/ProvenanceChip';
import { RegistrationBrackets } from '@/components/ui/RegistrationMark';
import { ImageSlot } from '@/components/common/ImageSlot';
import { getRun } from '@/data/runs';

const run = getRun('0f3a91')!;

/* The hero's proof is a real-looking analysis artifact rendered in the ACTUAL
   workspace components, in the dark workspace palette, inset into the light page
   — because that is what the product looks like. Not an illustration.
   Mocked analysis data; the imagery slot is empty until a scene is dropped in. */
export function AnalysisArtifact() {
  return (
    <div className="gt-dark flex flex-col gap-[10px]">
      <span className="label-caps text-secondary">A run, as it comes back</span>

      <div className="overflow-hidden rounded-container border border-border bg-neutral shadow-[var(--shadow-float)]">
        <div className="data-sm flex h-[36px] items-center gap-md border-b border-border px-[16px] text-secondary">
          <span>S2A_MSIL2A_20240712 · EPSG:32631 · 10 m/px</span>
          <span className="flex-1" />
          <span className="label-caps text-secondary">Run {run.id}</span>
        </div>

        <div className="grid grid-cols-[1.1fr_1fr] max-[720px]:grid-cols-1">
          <div className="relative min-h-[260px] border-r border-border bg-neutral max-[720px]:border-b max-[720px]:border-r-0">
            <RegistrationBrackets inset={10} style={{ position: 'absolute', inset: 0 }}>
              <ImageSlot label="SCENE · drop a GeoTIFF / COG" />
            </RegistrationBrackets>
            <div className="pointer-events-none absolute left-[20%] top-[28%] h-[24%] w-[30%]">
              <span className="absolute left-0 top-0 h-[14px] w-[14px] border-l border-t border-primary" />
              <span className="absolute right-0 top-0 h-[14px] w-[14px] border-r border-t border-primary" />
              <span className="absolute bottom-0 left-0 h-[14px] w-[14px] border-b border-l border-primary" />
              <span className="absolute bottom-0 right-0 h-[14px] w-[14px] border-b border-r border-primary" />
              <span className="data-sm absolute left-0 top-[-18px] whitespace-nowrap text-primary">
                R1 · 6.21 km²
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="border-b border-border p-[16px]">
              <AnswerBlock question={run.query} tokens={run.answer ?? []} />
            </div>
            <div className="border-b border-border p-[16px]">
              <ConfidenceMeter value={run.confidence ?? 0} />
              <div className="mt-sm flex flex-wrap gap-sm">
                <ProvenanceChip kind="interpreted">interpreted · flood-seg-v3</ProvenanceChip>
                <ProvenanceChip kind="measured">measured · PostGIS</ProvenanceChip>
              </div>
            </div>
            <div className="py-[4px]">
              <ExecutionTrace stages={run.stages ?? []} />
            </div>
          </div>
        </div>
      </div>

      <span className="data-sm text-secondary">
        run {run.id} · {run.date} · {run.elapsed} — representative data, no analysis is run
      </span>
    </div>
  );
}
