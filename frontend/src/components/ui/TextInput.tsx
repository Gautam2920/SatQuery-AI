import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

/* Instrument-side input: surface fill, 3px control radius, hairline border.
   Error state is 1px tertiary plus an iconned message — never colour alone. */
export function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
  hint,
  mono = false,
  disabled = false,
  autoComplete,
  id,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  mono?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  id?: string;
  className?: string;
}) {
  const [focus, setFocus] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const line = error
    ? 'border-tertiary outline-tertiary'
    : focus
      ? 'border-primary outline-primary'
      : 'border-border';

  return (
    <div className={cn('flex flex-col gap-xs', className)}>
      {label && (
        <label htmlFor={inputId} className="label-caps text-secondary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${inputId}-msg` : undefined}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full rounded-control border bg-surface px-md py-sm text-on-surface transition-colors duration-[var(--dur-state)]',
          'outline-offset-2 focus:outline-2',
          mono ? 'data-md' : 'body-md',
          disabled && 'opacity-45',
          line,
        )}
      />
      {error ? (
        <span
          id={`${inputId}-msg`}
          className="body-sm flex items-center gap-xs text-tertiary-strong"
        >
          <Icon name="alert" size={13} /> {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-msg`} className="data-sm text-secondary">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
