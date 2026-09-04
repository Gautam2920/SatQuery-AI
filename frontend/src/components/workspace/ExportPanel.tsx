import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Divider';
import { Icon } from '@/components/ui/Icon';
import { Overlay } from '@/components/ui/Overlay';
import { band } from '@/data/runs';
import {
  ExportError,
  downloadExport,
  formatByteSize,
  generateExport,
  type ExportFormatId,
  type ExportOptions,
  type GeneratedExport,
} from '@/lib/export';
import type { Run } from '@/data/types';

const FORMATS: { id: ExportFormatId; name: string; desc: string }[] = [
  {
    id: 'pdf',
    name: 'PDF report',
    desc: 'answer, confidence, evidence table, trace, scene metadata',
  },
  {
    id: 'bundle',
    name: 'Evidence bundle',
    desc: 'GeoJSON regions in EPSG:4326 plus the full run manifest',
  },
  {
    id: 'csv',
    name: 'CSV measurements',
    desc: 'one row per region, units in header',
  },
];

const OPTION_LABELS: { key: keyof ExportOptions; label: string }[] = [
  { key: 'executionTrace', label: 'execution trace' },
  { key: 'lowConfidenceRegions', label: 'low-confidence regions' },
  { key: 'modelVersions', label: 'model versions & parameters' },
];

/* Export slide-over (wireframe 1j). Every artefact is built from the values the
   run carries; the checksum is a SHA-256 of the downloaded bytes. */
export function ExportPanel({ run, onClose }: { run: Run; onClose: () => void }) {
  const titleId = useId();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormatId>('pdf');
  const [options, setOptions] = useState<ExportOptions>({
    executionTrace: true,
    lowConfidenceRegions: true,
    modelVersions: true,
  });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedExport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confidence = run.confidence;
  const summary = run.exportSummary ?? run.query;
  const regionCount = run.regions?.length ?? 0;
  const locatedRegionCount = run.regions?.filter((region) => region.geometry).length ?? 0;
  const bundleUnavailable = selectedFormat === 'bundle' && locatedRegionCount === 0;

  const resetGeneratedArtefact = () => {
    setGenerated(null);
    setError(null);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const artefact = await generateExport(run, selectedFormat, options);

      setGenerated(artefact);
      downloadExport(artefact);
    } catch (cause) {
      setGenerated(null);
      setError(
        cause instanceof ExportError
          ? cause.message
          : `Export failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Overlay onClose={onClose} labelledBy={titleId} align="end">
      <div className="gt-scroll flex h-full w-[520px] max-w-full flex-col gap-[14px] overflow-y-auto border-l border-border bg-surface p-lg shadow-[var(--shadow-float)]">
        <div className="flex items-center gap-md">
          <span id={titleId} className="label-caps flex-1 text-secondary">
            Export run {run.id}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export"
            className="flex h-[24px] w-[24px] items-center justify-center rounded-control border border-border text-secondary hover:border-primary hover:text-primary"
          >
            <Icon name="x" size={12} />
          </button>
        </div>

        <div className="flex flex-col gap-sm">
          {FORMATS.map((format) => {
            const selected = format.id === selectedFormat;

            return (
              <button
                key={format.id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setSelectedFormat(format.id);
                  resetGeneratedArtefact();
                }}
                className={cn(
                  'rounded-control border p-[10px_12px] text-left transition-colors duration-[var(--dur-state)]',
                  selected ? 'border-primary' : 'border-border',
                )}
              >
                <span className="flex items-center gap-[6px]">
                  {selected && <Icon name="check" size={12} className="text-primary" />}
                  <span className="title-sm text-[length:var(--text-label-caps-size)]">
                    {format.name}
                  </span>
                  {selected && <span className="label-caps ml-auto text-primary">selected</span>}
                </span>
                <span className="data-sm mt-[4px] block text-secondary">{format.desc}</span>
              </button>
            );
          })}
        </div>

        <Divider />
        <span className="label-caps text-secondary">Include</span>
        <div className="data-sm flex flex-col gap-[7px]">
          {OPTION_LABELS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between text-on-surface">
              <span>{label}</span>
              <button
                type="button"
                aria-pressed={options[key]}
                aria-label={label}
                onClick={() => {
                  setOptions((current) => ({ ...current, [key]: !current[key] }));
                  resetGeneratedArtefact();
                }}
                className={cn(
                  'data-sm rounded-control border px-[6px] py-px',
                  options[key] ? 'border-primary text-primary' : 'border-border text-secondary',
                )}
              >
                {options[key] ? 'on' : 'off'}
              </button>
            </div>
          ))}
        </div>

        <Divider />
        <div className="data-sm border border-border bg-neutral p-md leading-[1.7] text-secondary">
          preview
          <br />
          run {run.id} · {run.date} · analyst {run.user}
          <br />
          {summary} ·{' '}
          {confidence != null ? `${confidence.toFixed(2)} ${band(confidence)}` : 'no answer'}
          <br />
          {regionCount} region(s) · {locatedRegionCount} with measured coordinates
        </div>

        {bundleUnavailable && (
          <div className="data-sm border border-border bg-neutral p-md leading-[1.6] text-secondary">
            This run has no measured geometry, so the evidence bundle would contain no
            coordinates. Run a query against a loaded scene to produce located evidence.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="data-sm border border-tertiary bg-[var(--tertiary-subtle)] p-md leading-[1.6] text-tertiary-strong"
          >
            <span className="flex items-center gap-[6px]">
              <Icon name="alert" size={12} />
              <span className="label-caps">Export failed</span>
            </span>
            <span className="mt-[4px] block">{error}</span>
          </div>
        )}

        {generated && (
          <div
            role="status"
            className="data-sm border border-verified p-md leading-[1.7] text-on-surface"
          >
            <span className="flex items-center gap-[6px] text-[var(--verified)]">
              <Icon name="check" size={12} />
              <span className="label-caps">Export downloaded</span>
            </span>
            <span className="mt-[4px] block break-all text-secondary">
              {generated.filename} · {formatByteSize(generated.byteLength)}
              <br />
              sha256 {generated.sha256}
            </span>
          </div>
        )}

        <span className="flex-1" />
        <div className="flex gap-sm">
          <Button
            full
            disabled={generating || bundleUnavailable}
            onClick={() => void handleGenerate()}
          >
            {generating ? 'Generating…' : generated ? 'Generate again' : 'Generate export'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
