import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { ContextColumn } from '@/components/workspace/ContextColumn';
import { ImageryCanvas } from '@/components/workspace/ImageryCanvas';
import { EvidenceColumn } from '@/components/workspace/EvidenceColumn';
import { EvidenceInspector } from '@/components/workspace/EvidenceInspector';
import { ExportPanel } from '@/components/workspace/ExportPanel';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useRunPipeline } from '@/hooks/useRunPipeline';
import { getRun } from '@/data/runs';
import { getScene } from '@/data/scenes';

/* Wireframes 1d (empty) · 1e (running) · 1f (answer + evidence) · 1g (inspector)
   · 1j (export) · 1k (failure). One page; the context and evidence columns are
   re-rendered per state to match each screen. */
export function WorkspacePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const { status, activeRun, displayStages, note, start, stop, reset, hydrate } =
    useRunPipeline(reducedMotion);

  const [query, setQuery] = useState('Where is the flooded cropland?');
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

  const scene = getScene(sceneParam ?? activeRun?.sceneId);
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
        reset();
        return;
      }
      if (r.kind === 'change') {
        navigate('/compare', { replace: true });
        return;
      }
      hydrate(r);
      setQuery(r.query);
      setSelectedId(r.regions?.[0]?.id ?? null);
      setExportOpen(Boolean(exportParam));
      return;
    }
    if (qParam) {
      setQuery(qParam);
      const route = start(qParam);
      if (route.kind === 'change') navigate('/compare', { replace: true });
      return;
    }
    reset();
  }, [runParam, qParam, exportParam, start, reset, hydrate, navigate]);

  // first region becomes the active selection when an answer settles
  useEffect(() => {
    if (status === 'answer') setSelectedId((cur) => cur ?? activeRun?.regions?.[0]?.id ?? null);
  }, [status, activeRun]);

  const handleRun = useCallback(
    (q: string) => {
      if (!q.trim()) return;
      setInspectorId(null);
      setExportOpen(false);
      setSelectedId(null);
      const route = start(q);
      if (route.kind === 'change') {
        navigate('/compare');
        return;
      }
      if (runParam || qParam || exportParam) {
        startedByUser.current = true;
        setParams({}, { replace: true });
      }
    },
    [runParam, qParam, exportParam, setParams, start, navigate],
  );

  const openInspector = useCallback((id: string) => {
    setSelectedId(id);
    setInspectorId(id);
  }, []);

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
            onStop={stop}
            onChangeScene={() => navigate('/library')}
            run={activeRun}
            note={note}
          />
        }
        canvas={
          <ImageryCanvas
            scene={scene}
            regions={regions}
            selectedId={selectedId}
            onSelect={openInspector}
            status={status}
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
            onFix={() =>
              reset('Parcel layer reprojected to EPSG:32631. Re-run the query when ready.')
            }
            onEditPlan={() => reset()}
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
