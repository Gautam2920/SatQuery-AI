import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  ensureWorkspaceProject,
  listProjectImages,
  uploadScene,
  type SceneImage,
} from '@/lib/api';

export type BackendStatus = 'connecting' | 'ready' | 'unavailable';

/** Prithvi consumes the six HLS bands; anything else cannot be analysed. */
const PRITHVI_BAND_COUNT = 6;

export function isAnalysable(image: SceneImage): boolean {
  return image.band_count === PRITHVI_BAND_COUNT && image.storage_key !== null;
}

interface UseLiveScenes {
  status: BackendStatus;
  scenes: SceneImage[];
  selectedScene: SceneImage | null;
  selectScene: (imageId: string) => void;
  upload: (file: File) => Promise<void>;
  uploading: boolean;
  error: string | null;
}

export function useLiveScenes(): UseLiveScenes {
  const [status, setStatus] = useState<BackendStatus>('connecting');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [scenes, setScenes] = useState<SceneImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const project = await ensureWorkspaceProject();
        const images = (await listProjectImages(project.id)).filter(isAnalysable);

        if (cancelled) return;

        setProjectId(project.id);
        setScenes(images);
        setSelectedId((current) => current ?? images[0]?.id ?? null);
        setStatus('ready');
      } catch (cause) {
        if (cancelled) return;

        setStatus('unavailable');
        setError(cause instanceof ApiError ? cause.message : String(cause));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const upload = useCallback(
    async (file: File) => {
      if (!projectId) return;

      setUploading(true);
      setError(null);

      try {
        const image = await uploadScene(projectId, file);

        if (!isAnalysable(image)) {
          setError(
            `${image.filename} has ${image.band_count} bands; Prithvi needs ` +
              `${PRITHVI_BAND_COUNT} (B02 B03 B04 B8A B11 B12).`,
          );
          return;
        }

        setScenes((current) => [image, ...current]);
        setSelectedId(image.id);
      } catch (cause) {
        setError(cause instanceof ApiError ? cause.message : String(cause));
      } finally {
        setUploading(false);
      }
    },
    [projectId],
  );

  return {
    status,
    scenes,
    selectedScene: scenes.find((scene) => scene.id === selectedId) ?? null,
    selectScene: setSelectedId,
    upload,
    uploading,
    error,
  };
}
