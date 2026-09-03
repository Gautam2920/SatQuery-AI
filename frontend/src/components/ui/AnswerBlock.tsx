import { cn } from '@/lib/cn';
import type { AnswerToken } from '@/data/types';

/* The answer is prose, not a discrete object: body-lg Archivo on surface, NOT
   wrapped in a card. It resolves in place — it never types out. Inline evidence
   references are underlined in primary; numeric values are data-md Plex Mono
   inline. Composed from typed tokens, never an HTML string. */

export function InlineValue({
  tone = 'default',
  children,
}: {
  tone?: 'default' | 'measured';
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'font-mono text-[length:var(--text-data-md-size)] tabular-nums',
        tone === 'measured' ? 'text-verified' : 'text-inherit',
      )}
      style={{ fontFeatureSettings: 'var(--font-feature-data)' }}
    >
      {children}
    </span>
  );
}

export function EvidenceRef({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="m-0 inline cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-primary underline decoration-1 underline-offset-[3px] hover:text-primary-strong"
    >
      {children}
    </button>
  );
}

export function AnswerBlock({
  question,
  tokens,
  footnote,
  onRefClick,
  className,
}: {
  question?: string;
  tokens: AnswerToken[];
  footnote?: string;
  onRefClick?: (regionId: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-md', className)}>
      {question && <p className="body-md prose-measure text-secondary">{question}</p>}
      <p className="body-lg prose-measure text-on-surface">
        {tokens.map((tok, i) => {
          if (tok.t === 'text') return <span key={i}>{tok.value}</span>;
          if (tok.t === 'value')
            return (
              <InlineValue key={i} tone={tok.tone}>
                {tok.value}
              </InlineValue>
            );
          return (
            <EvidenceRef key={i} onClick={() => onRefClick?.(tok.regionId)}>
              {tok.value}
            </EvidenceRef>
          );
        })}
      </p>
      {footnote && <p className="data-sm text-secondary">{footnote}</p>}
    </div>
  );
}
