import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { ContextColumn } from '@/components/workspace/ContextColumn';
import { ImageryCanvas } from '@/components/workspace/ImageryCanvas';
import { EvidenceColumn } from '@/components/workspace/EvidenceColumn';
import { EvidenceInspector } from '@/components/workspace/EvidenceInspector';
import { ExportPanel } from '@/components/workspace/ExportPanel';
import { LiveScenePanel } from '@/components/workspace/LiveScenePanel';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useRunPipeline } from '@/hooks/useRunPipeline';
import { useAnalysisRun } from '@/hooks/useAnalysisRun';
import { useLiveScenes } from '@/hooks/useLiveScenes';
import { getRun } from '@/data/runs';
import { getScene } from '@/data/scenes';
import { scenePreviewUrl } from '@/lib/api';
import type { Scene } from '@/data/types';

/* Wireframes 1d (empty) · 1e (running) · 1f (answer + evidence) · 1g (inspector)
   · 1j (export) · 1k (failure). One page.

   The workspace runs live against the backend whenever a scene is loaded: the
   query hits POST /images/{id}/analysis, which runs the Prithvi encoder and
   measures the resulting regions. The authored runs remain reachable through
   `?run=` deep links from the run history, and drive the page when no live scene
   is loaded. */
export function WorkspacePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  const mockPipeline = useRunPipeline(reducedMotion);
  const liveScenes = useLiveScenes();
  const liveRun = useAnalysisRun();

  const [query, setQuery] = useState('Where is the vegetation?');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspectorId, setInspectorId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  // a run started from the UI clears the URL params itself; the deep-link effect
  // must not then treat the now-empty params as "return to idle".
  const startedByUser = useRef(false);

  const runParam = params.get('run');
  const qParam = params.get('q');
  const exportParam = params.get('export');
  const sceneParam = params.get('scene');

  const liveScene = liveScenes.selectedScene;
  const replayingAuthoredRun = Boolean(runParam);
  const live = Boolean(liveScene) && !replayingAuthoredRun;

  const pipeline = live ? liveRun : mockPipeline;
  const { status, activeRun, displayStages } = pipeline;

  const scene: Scene =
    live && liveRun.result
      ? liveRun.result.scene
      : live && liveScene
        ? {
            id: liveScene.filename,
            sensor: 'HLS Sentinel-2',
            pass: 'loaded scene',
            crs: liveScene.crs ?? 'unknown',
            gsd: '30 m/px',
            extent: `${liveScene.width} × ${liveScene.height} px`,
            kind: 'optical',
          }
        : getScene(sceneParam ?? activeRun?.sceneId);

  const regions = activeRun?.regions ?? [];
  const inspectorRegion = regions.find((r) => r.id === inspectorId) ?? null;

  // -- deep links -----------------------------------------------------------
  useEffect(() => {
    if (startedByUser.current) {
      startedByUser.current = false;
      return;
    }
    if (runParam) {
      const r = getRun(runParam);
      if (!r) {
        mockPipeline.reset();
        return;
      }
      if (r.kind === 'change') {
        navigate('/compare', { replace: true });
        return;
      }
      mockPipeline.hydrate(r);
      setQuery(r.query);
      setSelectedId(r.regions?.[0]?.id ?? null);
      setExportOpen(Boolean(exportParam));
      return;
    }
    if (qParam) {
      setQuery(qParam);
      return;
    }
    mockPipeline.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runParam, qParam, exportParam, navigate]);


  // first region becomes the active selection when an answer settles
  useEffect(() => {
    if (status === 'answer') setSelectedId((cur) => cur ?? activeRun?.regions?.[0]?.id ?? null);
  }, [status, activeRun]);

  const handleRun = useCallback(
    (nextQuery: string) => {
      if (!nextQuery.trim()) return;

      setQuery(nextQuery);
      setInspectorId(null);
      setExportOpen(false);
      setSelectedId(null);

      if (runParam || qParam || exportParam) {
        startedByUser.current = true;
        setParams({}, { replace: true });
      }

      if (liveScene) {
        void liveRun.run(liveScene.id, nextQuery);
        return;
      }

      const route = mockPipeline.start(nextQuery);
      if (route.kind === 'change') navigate('/compare');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runParam, qParam, exportParam, setParams, navigate, liveScene, liveRun.run],
  );

  // `?q=` auto-runs, but only once the backend has reported whether a live scene
  // exists — otherwise the run would always fall to the authored pipeline.
  const autoRanQuery = useRef<string | null>(null);

  useEffect(() => {
    if (!qParam || runParam) return;
    if (liveScenes.status === 'connecting') return;
    if (autoRanQuery.current === qParam) return;

    autoRanQuery.current = qParam;
    handleRun(qParam);
  }, [qParam, runParam, liveScenes.status, handleRun]);

  const openInspector = useCallback((id: string) => {
    setSelectedId(id);
    setInspectorId(id);
  }, []);

  const resetRun = useCallback(() => {
    if (live) liveRun.reset();
    else mockPipeline.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, liveRun.reset, mockPipeline.reset]);

  return (
    <>
      <WorkspaceShell
        context={
          <ContextColumn
            status={status}
            scene={scene}
            query={query}
            onQuery={setQuery}
            onRun={handleRun}
            onStop={resetRun}
            onChangeScene={() => navigate('/library')}
            run={activeRun}
            note={live ? null : mockPipeline.note}
            scenePanel={
              replayingAuthoredRun ? undefined : (
                <LiveScenePanel
                  status={liveScenes.status}
                  scenes={liveScenes.scenes}
                  selectedScene={liveScene}
                  onSelectScene={liveScenes.selectScene}
                  onUpload={(file) => void liveScenes.upload(file)}
                  uploading={liveScenes.uploading}
                  error={liveScenes.error}
                />
              )
            }
          />
        }
        canvas={
          <ImageryCanvas
            scene={scene}
            regions={regions}
            selectedId={selectedId}
            onSelect={openInspector}
            status={status}
            previewUrl={live && liveScene ? scenePreviewUrl(liveScene.id) : undefined}
            modelLabel={live ? 'prithvi-eo-v2-tiny · encoder' : undefined}
          />
        }
        evidence={
          <EvidenceColumn
            status={status}
            displayStages={displayStages}
            run={activeRun}
            selectedId={selectedId}
            onSelect={openInspector}
            onExport={() => setExportOpen(true)}
            onRefine={() => setQuery(activeRun?.query ?? query)}
            onFix={live ? () => handleRun(query) : () => mockPipeline.reset(
              'Parcel layer reprojected to EPSG:32631. Re-run the query when ready.',
            )}
            onEditPlan={resetRun}
            fixLabel={live ? 'Retry run' : undefined}
          />
        }
      />

      {inspectorRegion && (
        <EvidenceInspector region={inspectorRegion} onClose={() => setInspectorId(null)} />
      )}
      {exportOpen && activeRun && (
        <ExportPanel run={activeRun} onClose={() => setExportOpen(false)} />
      )}
    </>
  );
}
