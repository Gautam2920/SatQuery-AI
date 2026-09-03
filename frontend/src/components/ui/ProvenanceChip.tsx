import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import type { Provenance } from '@/data/types';

/* Every piece of evidence is tagged with its provenance. This tagging is the
   product's thesis in miniature and is mandatory on every evidence item. */
const KIND: Record<Provenance, { cls: string; icon: IconName; word: string }> = {
  interpreted: {
    cls: 'bg-primary-subtle text-primary-strong border-transparent',
    icon: 'cpu',
    word: 'interpreted',
  },
  measured: {
    cls: 'bg-surface text-verified border-border',
    icon: 'crosshair',
    word: 'measured',
  },
  change: {
    cls: 'bg-tertiary-subtle text-tertiary-strong border-transparent',
    icon: 'compare',
    word: 'changed',
  },
};

export function ProvenanceChip({
  kind = 'interpreted',
  children,
  title,
  className,
}: {
  kind?: Provenance;
  children?: React.ReactNode;
  title?: string;
  className?: string;
}) {
  const k = KIND[kind];
  return (
    <span
      title={title}
      className={cn(
        'data-sm inline-flex items-center gap-xs whitespace-nowrap rounded-control border px-sm py-[3px]',
        k.cls,
        className,
      )}
    >
      <Icon name={k.icon} size={11} />
      {children ?? k.word}
    </span>
  );
}

/* Solid vermilion fill with neutral text, label-caps. Always icon + word. */
export function ChangeBadge({
  children = 'changed',
  icon = 'compare',
  className,
}: {
  children?: React.ReactNode;
  icon?: IconName;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'label-caps inline-flex items-center gap-xs whitespace-nowrap rounded-control bg-tertiary px-sm py-[3px] text-neutral',
        className,
      )}
    >
      <Icon name={icon} size={11} strokeWidth={2} />
      {children}
    </span>
  );
}
