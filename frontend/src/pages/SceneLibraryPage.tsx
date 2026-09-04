import { useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Button, LinkButton } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Divider } from '@/components/ui/Divider';
import { MetaValue } from '@/components/ui/MetaValue';
import { RegistrationBrackets } from '@/components/ui/RegistrationMark';
import { StatusDot } from '@/components/ui/StatusDot';
import { PageShell } from '@/components/workspace/PageShell';
import { isGeoTiff } from '@/components/workspace/ImageryCanvas';
import { describeUnanalysable, isAnalysable, useLiveScenes } from '@/hooks/useLiveScenes';
import { useScenePreview } from '@/hooks/useScenePreview';
import type { SceneImage } from '@/lib/api';

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function describeScene(scene: SceneImage): string {
  return `${scene.width} × ${scene.height} px · ${scene.band_count} band${
    scene.band_count === 1 ? '' : 's'
  } · ${scene.crs ?? 'no CRS'}`;
}

export function SceneLibraryPage() {
  const { status, scenes, selectedScene, selectScene, upload, uploading, error } =
    useLiveScenes();
  const [search, setSearch] = useState('');
  const [draggingFile, setDraggingFile] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useScenePreview(selectedScene?.id);

  const matchingScenes = useMemo(() => {
    const term = search.trim().toLowerCase();

    return term ? scenes.filter((s) => s.filename.toLowerCase().includes(term)) : scenes;
  }, [scenes, search]);

  const importScene = (file: File) => {
    if (!isGeoTiff(file)) {
      setImportError(`${file.name} is not a GeoTIFF. Import a .tif or .tiff file.`);
      return;
    }

    setImportError(null);
    void upload(file);
  };

  return (
    <PageShell>
      <div className="flex w-[320px] flex-none flex-col border-r border-border max-[760px]:w-full max-[760px]:border-b max-[760px]:border-r-0">
        <div className="flex flex-col gap-md border-b border-border p-[14px_16px]">
          <span className="label-caps text-secondary">Scene library</span>
          <div className="flex items-center gap-sm">
            <StatusDot
              tone={
                status === 'ready' ? 'done' : status === 'connecting' ? 'running' : 'failed'
              }
              pulse={status === 'connecting'}
            />
            <span className="data-sm text-secondary">
              {status === 'ready'
                ? `${scenes.length} scene${scenes.length === 1 ? '' : 's'} in your workspace`
                : status === 'connecting'
                  ? 'connecting to backend'
                  : 'backend unavailable'}
            </span>
          </div>
          <label className="data-sm flex h-[32px] items-center rounded-control border border-border bg-surface px-[10px] text-secondary">
            <span className="sr-only">Search scenes</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="search by filename"
              className="w-full bg-transparent text-on-surface outline-none placeholder:text-secondary"
            />
          </label>
        </div>

        <div className="gt-scroll flex-1 overflow-y-auto">
          {matchingScenes.length === 0 ? (
            <p className="body-sm p-[14px_16px] text-secondary">
              {status === 'unavailable'
                ? 'No scenes can be listed while the backend is unreachable.'
                : scenes.length === 0
                  ? 'No scenes yet. Import a GeoTIFF below to get started.'
                  : 'No scene matches that search.'}
            </p>
          ) : (
            <ul>
              {matchingScenes.map((scene) => {
                const selected = scene.id === selectedScene?.id;

                return (
                  <li key={scene.id}>
                    <button
                      type="button"
                      onClick={() => selectScene(scene.id)}
                      aria-current={selected ? 'true' : undefined}
                      className={cn(
                        'flex w-full gap-[10px] border-b border-l-2 border-border p-[10px_16px] text-left transition-colors duration-[var(--dur-state)] hover:bg-surface-raised',
                        selected ? 'border-l-primary bg-surface-raised' : 'border-l-transparent',
                      )}
                    >
                      <span className="h-[44px] w-[56px] flex-none border border-border bg-neutral" />
                      <span className="min-w-0">
                        <span className="data-sm block truncate text-on-surface">
                          {scene.filename}
                        </span>
                        <span className="data-sm mt-[3px] block text-secondary">
                          {describeScene(scene)}
                        </span>
                        {!isAnalysable(scene) && (
                          <span className="data-sm mt-[2px] block text-secondary">
                            preview only
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-col gap-sm border-b border-border p-[12px_16px]">
            <span className="label-caps text-secondary">Import</span>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDraggingFile(true);
              }}
              onDragLeave={() => setDraggingFile(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDraggingFile(false);
                const dropped = event.dataTransfer.files?.[0];
                if (dropped) importScene(dropped);
              }}
              className={cn(
                'data-sm flex h-[64px] items-center justify-center rounded-control border border-dashed text-center transition-colors duration-[var(--dur-state)]',
                draggingFile ? 'border-primary text-primary' : 'border-border text-secondary',
              )}
            >
              {uploading
                ? 'importing…'
                : draggingFile
                  ? 'drop to import'
                  : 'drop a GeoTIFF here'}
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={status !== 'ready' || uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Importing…' : 'Choose a GeoTIFF'}
            </Button>
            <label htmlFor="scene-library-import" className="sr-only">
              Import a GeoTIFF scene
            </label>
            <input
              ref={fileInputRef}
              id="scene-library-import"
              type="file"
              accept=".tif,.tiff"
              hidden
              onChange={(event) => {
                const chosen = event.target.files?.[0];
                if (chosen) importScene(chosen);
                event.target.value = '';
              }}
            />
            {(importError || error) && (
              <Callout title="Import">{importError ?? error}</Callout>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="data-sm flex h-[40px] flex-none items-center gap-[14px] border-b border-border px-[16px] text-secondary">
          <span className="truncate text-on-surface">
            {selectedScene?.filename ?? 'No scene selected'}
          </span>
          {selectedScene && <span>{selectedScene.crs ?? 'no CRS'}</span>}
          <span className="flex-1" />
          <LinkButton
            to={selectedScene ? `/workspace?image=${selectedScene.id}` : '/workspace'}
            size="sm"
          >
            Open in workspace
          </LinkButton>
        </div>
        <div className="relative flex min-h-[360px] flex-1">
          <RegistrationBrackets style={{ position: 'absolute', inset: 0 }}>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={`Render of ${selectedScene?.filename ?? 'the selected scene'}`}
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : (
              <div className="label-caps flex h-full items-center justify-center text-secondary">
                {selectedScene ? 'rendering preview…' : 'no scene selected'}
              </div>
            )}
          </RegistrationBrackets>
        </div>
      </div>

      <aside className="gt-scroll flex w-[260px] flex-none flex-col gap-md overflow-y-auto border-l border-border p-[14px_16px] max-[760px]:w-full max-[760px]:border-l-0 max-[760px]:border-t">
        <span className="label-caps text-secondary">Scene metadata</span>
        {selectedScene ? (
          <>
            <MetaValue label="File" value={selectedScene.filename} />
            <MetaValue
              label="Size"
              value={`${selectedScene.width} × ${selectedScene.height} px`}
              tone="measured"
            />
            <MetaValue
              label="Bands"
              value={String(selectedScene.band_count)}
              tone="measured"
            />
            <MetaValue label="Type" value={selectedScene.dtype} />
            <MetaValue label="CRS" value={selectedScene.crs ?? 'unknown'} />
            <MetaValue label="On disk" value={formatFileSize(selectedScene.file_size)} />
            <Divider />
            {isAnalysable(selectedScene) ? (
              <p className="body-sm text-secondary">
                Six HLS bands present. This scene can be analysed in the workspace.
              </p>
            ) : (
              <Callout tone="roadmap" tag="PREVIEW ONLY" title="Cannot be analysed">
                {describeUnanalysable(selectedScene)}
              </Callout>
            )}
          </>
        ) : (
          <p className="body-sm text-secondary">
            Select a scene to see the metadata read from its GeoTIFF header.
          </p>
        )}
      </aside>
    </PageShell>
  );
}
