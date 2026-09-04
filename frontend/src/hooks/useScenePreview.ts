import { useEffect, useState } from 'react';
import { fetchScenePreview } from '@/lib/api';

/** The preview endpoint requires a bearer token, which an <img> tag cannot send,
 *  so the PNG is fetched and handed to the canvas as an object URL. */
export function useScenePreview(imageId: string | undefined): string | undefined {
  const [objectUrl, setObjectUrl] = useState<string>();

  useEffect(() => {
    if (!imageId) {
      setObjectUrl(undefined);
      return;
    }

    let revokedUrl: string | undefined;
    let cancelled = false;

    fetchScenePreview(imageId)
      .then((png) => {
        if (cancelled) return;
        revokedUrl = URL.createObjectURL(png);
        setObjectUrl(revokedUrl);
      })
      .catch(() => {
        if (!cancelled) setObjectUrl(undefined);
      });

    return () => {
      cancelled = true;
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [imageId]);

  return objectUrl;
}
