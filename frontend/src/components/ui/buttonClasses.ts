import { cn } from '@/lib/cn';
import type { IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary';
export type ButtonSize = 'sm' | 'md';

export interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconEnd?: IconName;
  full?: boolean;
}

/* One primary button per view (DESIGN.md). There is no ghost or tertiary tier —
   if a screen needs a third level of action, it has too many actions. Primary
   hover deepens the fill; secondary hover shifts the text to amber rather than
   lifting or glowing. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  full = false,
}: ButtonBaseProps): string {
  return cn(
    'label-caps inline-flex items-center justify-center gap-sm rounded-control',
    'border cursor-pointer select-none whitespace-nowrap no-underline',
    'transition-[background-color,color] duration-[var(--dur-state)] ease-linear',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
    size === 'sm' ? 'px-[12px] py-[7px]' : 'px-[16px] py-[11px]',
    full && 'flex w-full',
    variant === 'primary'
      ? 'bg-primary text-neutral border-transparent hover:bg-primary-strong'
      : 'bg-surface-raised text-on-surface border-border hover:text-primary',
  );
}
