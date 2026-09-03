import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

const CORNER =
  'pointer-events-none absolute left-[6px] top-[6px] h-[var(--bracket-size)] w-[var(--bracket-size)] border-l border-t border-secondary';

/* The centerpiece of the context column and of the landing artifact —
   intentionally the softest, largest-radius element in the workspace. Archivo
   body-md (the user's own words, not instrument type). On submit it does not
   clear: it moves up and becomes the header of the running analysis. */
export function QueryInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Ask a question about this scene…',
  submitLabel = 'Run analysis',
  hint,
  disabled = false,
  rows = 3,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  placeholder?: string;
  submitLabel?: string;
  hint?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
}) {
  const [focus, setFocus] = useState(false);
  const id = useId();

  return (
    <div className={className}>
      <div
        className={cn(
          'relative rounded-container border bg-surface-raised transition-colors duration-[var(--dur-state)]',
          focus ? 'border-primary outline-2 outline-offset-2 outline-primary' : 'border-border',
        )}
      >
        <span aria-hidden="true" className={CORNER} />
        <label htmlFor={id} className="sr-only">
          {placeholder}
        </label>
        <textarea
          id={id}
          value={value}
          rows={rows}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              if (value.trim()) onSubmit(value);
            }
          }}
          className="body-md block w-full resize-none border-0 bg-transparent px-md pb-sm pl-[22px] pt-md text-on-surface outline-none placeholder:text-secondary"
        />
        <div className="flex items-center gap-md px-md pb-md pl-[22px]">
          {hint ? (
            <span className="data-sm flex-1 text-secondary">{hint}</span>
          ) : (
            <span className="flex-1" />
          )}
          <Button
            size="sm"
            icon="activity"
            disabled={disabled || !value.trim()}
            onClick={() => onSubmit(value)}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The submitted question, frozen above its own answer (running / change /
 *  answer states). Keeps the registration-bracket motif. */
export function StaticQuery({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-container border border-border bg-surface-raised p-md pl-[22px]">
      <span className={CORNER} aria-hidden="true" />
      <p className="body-sm text-on-surface">{children}</p>
    </div>
  );
}
