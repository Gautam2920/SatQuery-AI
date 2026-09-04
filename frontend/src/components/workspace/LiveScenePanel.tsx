import { useId, useRef } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { MetaValue } from '@/components/ui/MetaValue';
import { StatusDot } from '@/components/ui/StatusDot';
import { isAnalysable, type BackendStatus } from '@/hooks/useLiveScenes';
import type { SceneImage } from '@/lib/api';

const STATUS_COPY: Record<BackendStatus, { tone: 'running' | 'done' | 'failed'; label: string }> = {
  connecting: { tone: 'running', label: 'connecting to backend' },
  ready: { tone: 'done', label: 'backend connected' },
  unavailable: { tone: 'failed', label: 'backend unavailable' },
};

export function LiveScenePanel({
  status,
  scenes,
  selectedScene,
  onSelectScene,
  onUpload,
  uploading,
  error,
}: {
  status: BackendStatus;
  scenes: SceneImage[];
  selectedScene: SceneImage | null;
  onSelectScene: (imageId: string) => void;
  onUpload: (file: File) => void;
  uploading: boolean;
  error: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const connection = STATUS_COPY[status];

  return (
    <>
      <div className="flex items-center gap-sm">
        <StatusDot tone={connection.tone} pulse={status === 'connecting'} />
        <span className="data-sm text-secondary">{connection.label}</span>
      </div>

      <span className="label-caps text-secondary">Scene</span>

      {selectedScene ? (
        <>
          <MetaValue label="Id" value={selectedScene.filename} />
          <MetaValue label="Size" value={`${selectedScene.width} × ${selectedScene.height} px`} />
          <MetaValue
            label="Bands"
            value={String(selectedScene.band_count)}
            tone="measured"
          />
          <MetaValue label="CRS" value={selectedScene.crs ?? 'unknown'} />
          {!isAnalysable(selectedScene) && (
            <Callout tone="roadmap" tag="PREVIEW ONLY" title="Cannot be analysed">
              Prithvi reads six HLS bands (B02 B03 B04 B8A B11 B12). This scene has{' '}
              {selectedScene.band_count}, so it can be previewed but not analysed.
            </Callout>
          )}
        </>
      ) : (
        <p className="body-sm text-secondary">
          {status === 'unavailable'
            ? 'No scene can be loaded while the backend is unreachable.'
            : 'Load a 6-band HLS GeoTIFF (B02 B03 B04 B8A B11 B12) to analyse it.'}
        </p>
      )}

      {scenes.length > 1 && (
        <div className="flex flex-col gap-[6px]">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              type="button"
              onClick={() => onSelectScene(scene.id)}
              className={cn(
                'data-sm truncate rounded-control border px-[7px] py-[3px] text-left transition-colors duration-[var(--dur-state)]',
                scene.id === selectedScene?.id
                  ? 'border-primary text-primary'
                  : 'border-border text-secondary hover:border-primary hover:text-primary',
              )}
            >
              {scene.filename}
              {!isAnalysable(scene) && ' · preview only'}
            </button>
          ))}
        </div>
      )}

      <Button
        size="sm"
        variant="secondary"
        disabled={status !== 'ready' || uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? 'Uploading…' : 'Load GeoTIFF'}
      </Button>

      <label htmlFor={inputId} className="sr-only">
        Load a GeoTIFF scene
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept=".tif,.tiff"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          event.target.value = '';
        }}
      />

      {error && <Callout title="Scene error">{error}</Callout>}
    </>
  );
}
