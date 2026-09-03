import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface Column<Row> {
  key: string;
  label: string;
  align?: 'left' | 'right';
  render?: (row: Row) => ReactNode;
}

/* data-md with tabular figures, 8px row padding, label-caps secondary headers,
   hairline rules between rows, no zebra striping, no vertical rules. Numeric and
   coordinate columns right-align; identifiers left-align. */
export function DataTable<Row extends { id: string }>({
  columns,
  rows,
  activeId,
  onRowClick,
  caption,
  className,
}: {
  columns: Column<Row>[];
  rows: Row[];
  activeId?: string;
  onRowClick?: (row: Row) => void;
  caption?: string;
  className?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const interactive = Boolean(onRowClick);

  return (
    <table className={cn('data-md w-full border-collapse', className)}>
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              scope="col"
              className={cn(
                'label-caps whitespace-nowrap border-b border-border bg-surface px-md py-sm text-secondary',
                c.align === 'right' ? 'text-right' : 'text-left',
              )}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const active = row.id === activeId || hover === row.id;
          return (
            <tr
              key={row.id}
              onClick={interactive ? () => onRowClick?.(row) : undefined}
              onKeyDown={
                interactive
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick?.(row);
                      }
                    }
                  : undefined
              }
              onMouseEnter={() => setHover(row.id)}
              onMouseLeave={() => setHover(null)}
              tabIndex={interactive ? 0 : undefined}
              role={interactive ? 'button' : undefined}
              aria-current={row.id === activeId ? 'true' : undefined}
              className={cn(
                'transition-colors duration-[var(--dur-state)]',
                interactive && 'cursor-pointer',
                active ? 'bg-surface-raised' : 'bg-transparent',
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'whitespace-nowrap border-b border-border px-md py-sm tabular-nums',
                    c.align === 'right' ? 'text-right' : 'text-left',
                  )}
                >
                  {c.render ? c.render(row) : (row as Record<string, ReactNode>)[c.key]}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
