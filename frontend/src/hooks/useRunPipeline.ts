import { useCallback, useEffect, useRef, useState } from 'react';
import {
  classifyQuery,
  getRun,
  PIPELINE_DURATIONS,
  PIPELINE_STAGES,
  STAGE_DETAIL,
  type QueryRoute,
} from '@/data/runs';
import type { ExecutionStageData, Run } from '@/data/types';

export type PipelineStatus = 'idle' | 'running' | 'answer' | 'failure';

/** Watchable stage advance. The real product advances at --dur-pipeline (400ms);
 *  slowed here so a reviewer can follow the orchestrator's method. */
const STAGE_ADVANCE_MS = 850;
const REDUCED_SETTLE_MS = 320;

interface UseRunPipeline {
  status: PipelineStatus;
  activeRun: Run | null;
  /** the trace the evidence column renders for the current status */
  displayStages: ExecutionStageData[];
  /** transient note shown in the empty / ready state (e.g. "Run stopped…") */
  note: string | null;
  /** kick off a run. Returns the route so the caller can redirect on `change`. */
  start: (query: string) => QueryRoute;
  /** stop an in-flight run and return to the ready state */
  stop: () => void;
  /** clear back to the empty state, optionally with a note */
  reset: (note?: string) => void;
  /** jump straight to a finished run (deep link / run history reopen) */
  hydrate: (run: Run) => void;
}

function runningFrame(
  template: ExecutionStageData[],
  shown: number,
  stopAt: number,
): ExecutionStageData[] {
  return template.map((s, i) => {
    if (i >= shown) return { name: s.name, state: 'pending' };
    if (i < shown - 1) {
      return {
        name: s.name,
        duration: s.duration,
        state: s.state === 'pending' ? 'pending' : 'done',
      };
    }
    // the newly-revealed stage
    if (s.state === 'failed' || s.state === 'pending') return { ...s };
    return {
      name: s.name,
      state: shown >= stopAt ? 'done' : 'running',
      details: STAGE_DETAIL[s.name],
      defaultOpen: shown < stopAt,
    };
  });
}

export function useRunPipeline(reducedMotion: boolean): UseRunPipeline {
  const [status, setStatus] = useState<PipelineStatus>('idle');
  const [activeRun, setActiveRun] = useState<Run | null>(null);
  const [displayStages, setDisplayStages] = useState<ExecutionStageData[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const reset = useCallback(
    (nextNote?: string) => {
      clearTimers();
      setStatus('idle');
      setActiveRun(null);
      setDisplayStages([]);
      setNote(nextNote ?? null);
    },
    [clearTimers],
  );

  const settle = useCallback((run: Run) => {
    if (run.state === 'failed') {
      setStatus('failure');
      setDisplayStages(run.stages ?? []);
    } else {
      setStatus('answer');
      setDisplayStages(run.stages ?? []);
    }
    setActiveRun(run);
    setNote(null);
  }, []);

  const hydrate = useCallback(
    (run: Run) => {
      clearTimers();
      settle(run);
    },
    [clearTimers, settle],
  );

  const stop = useCallback(() => {
    clearTimers();
    reset('Run stopped before it completed.');
  }, [clearTimers, reset]);

  const start = useCallback(
    (query: string): QueryRoute => {
      const trimmed = query.trim();
      const route = classifyQuery(trimmed);
      if (route.kind === 'change') return route;

      const template = getRun(route.runId);
      if (!template) return route;
      const run: Run = { ...template, query: trimmed || template.query };

      clearTimers();
      setNote(null);
      setActiveRun(run);
      setStatus('running');

      const failing = route.kind === 'failure';
      const authored: ExecutionStageData[] = failing
        ? (run.stages ?? [])
        : PIPELINE_STAGES.map((name) => ({
            name,
            duration: PIPELINE_DURATIONS[name],
            state: 'done',
          }));
      const failIndex = authored.findIndex((s) => s.state === 'failed');
      const stopAt = failing && failIndex >= 0 ? failIndex + 1 : authored.length;

      setDisplayStages(runningFrame(authored, 0, stopAt));

      if (reducedMotion) {
        const t = setTimeout(() => settle(run), REDUCED_SETTLE_MS);
        timers.current.push(t);
        return route;
      }

      let shown = 0;
      const step = () => {
        shown += 1;
        setDisplayStages(runningFrame(authored, shown, stopAt));
        if (shown >= stopAt) {
          const t = setTimeout(() => settle(run), STAGE_ADVANCE_MS);
          timers.current.push(t);
          return;
        }
        const t = setTimeout(step, STAGE_ADVANCE_MS);
        timers.current.push(t);
      };
      const first = setTimeout(step, STAGE_ADVANCE_MS);
      timers.current.push(first);

      return route;
    },
    [clearTimers, reducedMotion, settle],
  );

  return { status, activeRun, displayStages, note, start, stop, reset, hydrate };
}
