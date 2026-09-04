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
import { useScenePreview } from '@/hooks/useScenePreview';
import { getRun } from '@/data/runs';
import { getScene } from '@/data/scenes';
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

  // a run started from the UI clears the URL params itself; the deep-link effect
  // must not then treat the now-empty params as "return to idle".
  const startedByUser = useRef(false);

  const runParam = params.get('run');
  const qParam = params.get('q');
  const exportParam = params.get('export');
  const exportOpen = exportParam === '1';
  const sceneParam = params.get('scene');
  const imageParam = params.get('image');

  // The scene library links here with the image it had selected.
  const requestedImageId = useRef<string | null>(null);

  useEffect(() => {
    if (!imageParam || requestedImageId.current === imageParam) return;
    if (!liveScenes.scenes.some((scene) => scene.id === imageParam)) return;

    requestedImageId.current = imageParam;
    liveScenes.selectScene(imageParam);
  }, [imageParam, liveScenes]);

  const liveScene = liveScenes.selectedScene;
  const scenePreviewObjectUrl = useScenePreview(liveScene?.id);
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
      return;
    }
    if (qParam) {
      setQuery(qParam);
      return;
    }
    mockPipeline.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // `exportParam` is deliberately not a dependency: opening the export panel
    // must not re-enter this effect and reset a run that is already on screen.
  }, [runParam, qParam, navigate]);


  // first region becomes the active selection when an answer settles
  useEffect(() => {
    if (status === 'answer') setSelectedId((cur) => cur ?? activeRun?.regions?.[0]?.id ?? null);
  }, [status, activeRun]);

  const handleRun = useCallback(
    (nextQuery: string) => {
      if (!nextQuery.trim()) return;

      setQuery(nextQuery);
      setInspectorId(null);
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

  const setExportOpen = useCallback(
    (open: boolean) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (open) next.set('export', '1');
          else next.delete('export');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

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
            previewUrl={live ? scenePreviewObjectUrl : undefined}
            modelLabel={live ? 'prithvi-eo-v2-tiny · encoder' : undefined}
            onDropScene={
              replayingAuthoredRun ? undefined : (file) => void liveScenes.upload(file)
            }
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
