import { useCallback, useState } from 'react';
import { PIPELINE_STAGES } from '@/data/runs';
import type { ExecutionStageData, Run } from '@/data/types';
import { ApiError, runAnalysis, type AnalysisResult } from '@/lib/api';
import type { PipelineStatus } from './useRunPipeline';

/** While the request is in flight no stage has reported yet, so every stage is
 *  shown as pending. The trace only ever claims work the backend actually did —
 *  real stages with real measured durations replace this on arrival. */
const AWAITING_TRACE: ExecutionStageData[] = PIPELINE_STAGES.map((name) => ({
  name,
  state: 'pending',
}));

interface UseAnalysisRun {
  status: PipelineStatus;
  activeRun: Run | null;
  result: AnalysisResult | null;
  displayStages: ExecutionStageData[];
  error: string | null;
  run: (imageId: string, query: string, regionCount?: number) => Promise<void>;
  reset: () => void;
}

function toRun(result: AnalysisResult): Run {
  const refused = result.outcome !== 'answered';

  return {
    id: result.runId,
    date: new Date().toISOString().slice(0, 10),
    user: 'live',
    elapsed: result.elapsed,
    query: result.query,
    sceneId: result.scene.id,
    state: refused ? 'refused' : 'complete',
    refusal: refused ? (result.refusal ?? undefined) : undefined,
    refusalKind: refused ? (result.outcome as Run['refusalKind']) : undefined,
    confidence: result.confidence,
    plan: `Resolved intent: ${result.intent}. Prithvi encoder segments the scene; areas and coordinates are measured from the raster CRS.`,
    answer: result.answer,
    confidenceNote: result.confidenceNote,
    provenance: result.provenance,
    regions: result.regions,
    stages: result.stages,
    layers: ['true colour', 'region boundaries'],
  };
}

function failedRun(query: string, failure: string): Run {
  return {
    id: 'live',
    date: new Date().toISOString().slice(0, 10),
    user: 'live',
    elapsed: '—',
    query,
    sceneId: 'live',
    state: 'failed',
    confidence: null,
    failure,
    stages: [],
  };
}

export function useAnalysisRun(): UseAnalysisRun {
  const [status, setStatus] = useState<PipelineStatus>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeRun, setActiveRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setActiveRun(null);
    setError(null);
  }, []);

  const run = useCallback(
    async (imageId: string, query: string, regionCount = 4) => {
      setStatus('running');
      setError(null);
      setResult(null);
      setActiveRun(null);

      try {
        const analysis = await runAnalysis(imageId, query, regionCount);

        setResult(analysis);
        setActiveRun(toRun(analysis));
        setStatus(analysis.outcome === 'answered' ? 'answer' : 'refused');
      } catch (cause) {
        const message = cause instanceof ApiError ? cause.message : String(cause);

        setError(message);
        setActiveRun(failedRun(query, message));
        setStatus('failure');
      }
    },
    [],
  );

  return {
    status,
    activeRun,
    result,
    displayStages: status === 'running' ? AWAITING_TRACE : (activeRun?.stages ?? []),
    error,
    run,
    reset,
  };
}
