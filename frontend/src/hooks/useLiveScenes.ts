import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  ensureWorkspaceProject,
  listProjectImages,
  uploadScene,
  type SceneImage,
} from '@/lib/api';

export type BackendStatus = 'connecting' | 'ready' | 'unavailable';

/** The backend decides compatibility and says why; the client only reports it. */
export function isAnalysable(image: SceneImage): boolean {
  return image.analysis_error === null && image.storage_key !== null;
}

export function describeUnanalysable(image: SceneImage): string {
  if (image.analysis_error) return image.analysis_error;

  return 'This scene has no stored raster, so it cannot be analysed.';
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
        const images = await listProjectImages(project.id);

        if (cancelled) return;

        setProjectId(project.id);
        setScenes(images);
        // Prefer a scene the model can actually run on, but keep the rest
        // listed so an imported scene never silently disappears.
        setSelectedId(
          (current) => current ?? (images.find(isAnalysable) ?? images[0])?.id ?? null,
        );
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

        setScenes((current) => [image, ...current]);
        setSelectedId(image.id);

        // Ingestion refuses incompatible imagery, so anything that arrives here
        // is analysable unless it is an older row stored before those rules.
        if (!isAnalysable(image)) setError(describeUnanalysable(image));
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
