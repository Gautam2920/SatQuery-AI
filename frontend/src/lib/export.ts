/* ============================================================================
   Run export.

   Every artefact here is built from the values the run actually carries. The
   checksum is a SHA-256 of the bytes being downloaded, so what the panel reports
   can be verified against the saved file with `sha256sum`. Nothing is authored.
   ========================================================================== */

import type { AnswerToken, EvidenceRegion, Run } from '@/data/types';

export type ExportFormatId = 'pdf' | 'bundle' | 'csv';

export interface ExportOptions {
  executionTrace: boolean;
  lowConfidenceRegions: boolean;
  modelVersions: boolean;
}

export interface GeneratedExport {
  filename: string;
  mimeType: string;
  byteLength: number;
  sha256: string;
  blob: Blob;
}

export class ExportError extends Error {}

const LOW_CONFIDENCE_THRESHOLD = 0.7;

export function answerToPlainText(answer: AnswerToken[] | undefined): string {
  if (!answer) return '';

  return answer.map((token) => token.value).join('');
}

function selectRegions(run: Run, options: ExportOptions): EvidenceRegion[] {
  const regions = run.regions ?? [];

  if (options.lowConfidenceRegions) return regions;

  return regions.filter((region) => region.confidence >= LOW_CONFIDENCE_THRESHOLD);
}

/** RFC 4180: quote every field and double any embedded quote. */
function toCsvRow(fields: (string | number)[]): string {
  return fields.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',');
}

function buildMeasurementsCsv(run: Run, regions: EvidenceRegion[]): string {
  const header = [
    'region_id',
    'class',
    'area',
    'perimeter',
    'centroid_lat_lon',
    'confidence_0_to_1',
    'provenance',
    'diagnostic_bands',
  ];

  const rows = regions.map((region) =>
    toCsvRow([
      region.id,
      region.className,
      region.area,
      region.perimeter,
      region.centroid,
      region.confidence.toFixed(2),
      region.provenance,
      region.bands,
    ]),
  );

  return [
    `# SatQuery AI measurements — run ${run.id} (${run.date})`,
    `# query: ${run.query}`,
    '# areas and coordinates measured from the raster CRS by rasterio/shapely/pyproj',
    toCsvRow(header),
    ...rows,
  ].join('\r\n');
}

function buildGeoJson(run: Run, regions: EvidenceRegion[]) {
  const located = regions.filter((region) => region.geometry);

  if (located.length === 0) {
    throw new ExportError(
      'This run carries no measured geometry, so there is nothing to write as ' +
        'GeoJSON. Run a query against a loaded scene to produce located evidence.',
    );
  }

  return {
    type: 'FeatureCollection' as const,
    // GeoJSON is always WGS84; named here because the measurements were
    // reprojected from the raster's own CRS.
    crs: 'EPSG:4326',
    features: located.map((region) => ({
      type: 'Feature' as const,
      id: region.id,
      geometry: region.geometry,
      properties: {
        run_id: run.id,
        class: region.className,
        area: region.area,
        perimeter: region.perimeter,
        centroid: region.centroid,
        confidence: region.confidence,
        provenance: region.provenance,
        diagnostic_bands: region.bands,
      },
    })),
  };
}

function buildRunManifest(run: Run, regions: EvidenceRegion[], options: ExportOptions) {
  return {
    run: {
      id: run.id,
      date: run.date,
      user: run.user,
      elapsed: run.elapsed,
      query: run.query,
      scene_id: run.sceneId,
      state: run.state,
      confidence: run.confidence,
      confidence_note: run.confidenceNote ?? null,
    },
    answer: answerToPlainText(run.answer),
    regions: regions.map((region) => ({
      id: region.id,
      class: region.className,
      area: region.area,
      perimeter: region.perimeter,
      centroid: region.centroid,
      confidence: region.confidence,
      provenance: region.provenance,
      diagnostic_bands: region.bands,
      geometry: region.geometry ?? null,
    })),
    execution_trace: options.executionTrace ? (run.stages ?? []) : undefined,
    plan: options.modelVersions ? (run.plan ?? null) : undefined,
    provenance: run.provenance ?? [],
    exported_at: new Date().toISOString(),
  };
}

async function buildPdfReport(
  run: Run,
  regions: EvidenceRegion[],
  options: ExportOptions,
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const report = new jsPDF({ unit: 'pt', format: 'a4' });

  const pageWidth = report.internal.pageSize.getWidth();
  const pageHeight = report.internal.pageSize.getHeight();
  const margin = 48;
  const textWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const advance = (amount: number) => {
    cursorY += amount;
    if (cursorY > pageHeight - margin) {
      report.addPage();
      cursorY = margin;
    }
  };

  const writeParagraph = (text: string, size: number, style: 'normal' | 'bold' = 'normal') => {
    report.setFont('helvetica', style);
    report.setFontSize(size);

    for (const line of report.splitTextToSize(text, textWidth) as string[]) {
      report.text(line, margin, cursorY);
      advance(size * 1.45);
    }
  };

  const writeHeading = (text: string) => {
    advance(10);
    writeParagraph(text.toUpperCase(), 9, 'bold');
  };

  writeParagraph('SatQuery AI — analysis report', 18, 'bold');
  writeParagraph(
    `Run ${run.id} · ${run.date} · analyst ${run.user} · elapsed ${run.elapsed}`,
    9,
  );
  advance(6);

  writeHeading('Query');
  writeParagraph(run.query, 11);

  const answerText = answerToPlainText(run.answer);
  if (answerText) {
    writeHeading('Answer');
    writeParagraph(answerText, 11);
  }

  if (run.confidence != null) {
    writeHeading('Confidence');
    writeParagraph(
      `${run.confidence.toFixed(2)} — ${run.confidenceNote ?? 'no note recorded'}`,
      10,
    );
  }

  if (run.failure) {
    writeHeading('Run halted');
    writeParagraph(run.failure, 10);
  }

  writeHeading(`Evidence — ${regions.length} region(s)`);
  if (regions.length === 0) {
    writeParagraph('No region met the export filter.', 10);
  }

  for (const region of regions) {
    writeParagraph(`${region.id} — ${region.className}`, 10, 'bold');
    writeParagraph(
      `area ${region.area} · perimeter ${region.perimeter} · centroid ${region.centroid} · ` +
        `confidence ${region.confidence.toFixed(2)} · ${region.provenance} · bands ${region.bands}`,
      9,
    );
    advance(2);
  }

  if (options.executionTrace && run.stages?.length) {
    writeHeading('Execution trace');
    for (const stage of run.stages) {
      writeParagraph(
        `${stage.name} — ${stage.state}${stage.duration ? ` · ${stage.duration}` : ''}`,
        9,
        'bold',
      );
      for (const detail of stage.details ?? []) {
        writeParagraph(`    ${detail.label}: ${detail.value}`, 8);
      }
    }
  }

  if (options.modelVersions && run.plan) {
    writeHeading('Plan and models');
    writeParagraph(run.plan, 9);
  }

  writeHeading('Provenance');
  writeParagraph(
    'Areas, perimeters and coordinates are computed by rasterio/shapely/pyproj from ' +
      "the raster's own CRS. Region separation comes from the pretrained Prithvi " +
      'encoder; land-cover labels come from spectral indices. Prototype build — not ' +
      'for operational decisions.',
    8,
  );

  return report.output('blob');
}

async function sha256Hex(blob: Blob): Promise<string> {
  const bytes = await blob.arrayBuffer();

  if (!globalThis.crypto?.subtle) return 'unavailable (requires a secure context)';

  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function generateExport(
  run: Run,
  format: ExportFormatId,
  options: ExportOptions,
): Promise<GeneratedExport> {
  const regions = selectRegions(run, options);

  let blob: Blob;
  let filename: string;

  if (format === 'csv') {
    if (regions.length === 0) {
      throw new ExportError(
        'No region passed the export filter, so the CSV would have no rows. ' +
          'Enable "low-confidence regions" or run a query that returns evidence.',
      );
    }

    blob = new Blob([buildMeasurementsCsv(run, regions)], {
      type: 'text/csv;charset=utf-8',
    });
    filename = `satquery-run-${run.id}-measurements.csv`;
  } else if (format === 'bundle') {
    const bundle = {
      ...buildRunManifest(run, regions, options),
      geojson: buildGeoJson(run, regions),
    };

    blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/geo+json',
    });
    filename = `satquery-run-${run.id}-evidence.geojson.json`;
  } else {
    blob = await buildPdfReport(run, regions, options);
    filename = `satquery-run-${run.id}-report.pdf`;
  }

  return {
    filename,
    mimeType: blob.type,
    byteLength: blob.size,
    sha256: await sha256Hex(blob),
    blob,
  };
}

export function downloadExport(generated: GeneratedExport): void {
  const objectUrl = URL.createObjectURL(generated.blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = generated.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}

export function formatByteSize(byteLength: number): string {
  if (byteLength < 1024) return `${byteLength} B`;
  if (byteLength < 1024 * 1024) return `${(byteLength / 1024).toFixed(1)} kB`;

  return `${(byteLength / (1024 * 1024)).toFixed(2)} MB`;
}
