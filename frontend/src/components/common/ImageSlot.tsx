import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

/* A user-fillable imagery placeholder. The wireframes use an <image-slot> custom
   element with sidecar persistence (an omelette-runtime feature); this is a
   lightweight React equivalent — drag a raster in or click to browse, letterboxed
   on --neutral (never black). No persistence across reloads by design. */
const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/tiff'];

export function ImageSlot({
  label = 'Drop the scene imagery — letterboxes on #100e0c, never black',
  hideLabel = false,
  className,
  onFill,
}: {
  label?: string;
  hideLabel?: boolean;
  className?: string;
  onFill?: (filled: boolean) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const ingest = (file: File | undefined) => {
    if (!file || !ACCEPT.includes(file.type)) return;
    setUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    onFill?.(true);
  };

  return (
    <div
      className={cn(
        'absolute inset-0 bg-[var(--neutral)]',
        over && 'outline-2 -outline-offset-2 outline-primary',
        className,
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        ingest(e.dataTransfer.files[0]);
      }}
    >
      {url ? (
        <img src={url} alt="Loaded scene imagery" className="h-full w-full object-cover" />
      ) : hideLabel ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Load scene imagery"
          className="absolute inset-0 cursor-pointer border-0 bg-transparent"
        />
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="data-sm absolute left-[16px] top-[14px] max-w-[60%] cursor-pointer border-0 bg-transparent p-0 text-left tracking-[0.04em] text-secondary hover:text-primary-strong"
        >
          {label}
          <span className="block text-secondary/80">or click to browse</span>
        </button>
      )}
      <label htmlFor={id} className="sr-only">
        Load scene imagery
      </label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPT.join(',')}
        hidden
        onChange={(e) => {
          ingest(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
