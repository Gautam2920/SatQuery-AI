import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import type { ReactNode } from 'react';

/* alert: vermilion-subtle fill, body-sm, always a leading icon and a heading.
   roadmap: hairline-outlined panel with a label-caps ROADMAP tag and a one-line
   description of what it WILL do — never a mocked result. */
export function Callout({
  tone = 'alert',
  title,
  tag,
  icon,
  children,
  action,
  className,
}: {
  tone?: 'alert' | 'roadmap';
  title: ReactNode;
  tag?: string;
  icon?: IconName;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const roadmap = tone === 'roadmap';
  return (
    <div
      role={roadmap ? undefined : 'alert'}
      className={cn(
        'flex flex-none gap-sm rounded-control border p-md',
        roadmap ? 'border-border bg-transparent' : 'border-transparent bg-tertiary-subtle',
        className,
      )}
    >
      <span className={cn('pt-[2px]', roadmap ? 'text-secondary' : 'text-tertiary-strong')}>
        <Icon name={icon ?? (roadmap ? 'arrow-right' : 'alert')} size={14} />
      </span>
      <div className="flex flex-1 flex-col gap-xs">
        <div className="flex items-baseline gap-sm">
          <h4
            className={cn('title-sm flex-1', roadmap ? 'text-on-surface' : 'text-tertiary-strong')}
          >
            {title}
          </h4>
          {(roadmap || tag) && (
            <span className="label-caps text-secondary">{tag ?? 'Roadmap'}</span>
          )}
        </div>
        <p
          className={cn(
            'body-sm prose-measure',
            roadmap ? 'text-secondary' : 'text-tertiary-strong',
          )}
        >
          {children}
        </p>
        {action}
      </div>
    </div>
  );
}
