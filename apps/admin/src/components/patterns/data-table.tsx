import { ChevronRight } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Panel } from '@/components/base/panel';
import { Skeleton } from '@/components/base/skeleton';
import type { TagTone } from '@/components/base/tag';
import { Callout } from '@/components/patterns/callout';
import { EmptyState } from '@/components/patterns/empty-state';
import { errorMessage } from '@/lib/errors';
import { cn, staggered } from '@/lib/utils';

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  align?: 'end' | 'center';
  width?: string;
  /** Row identity reads `strong`, supporting data `muted`, codes `mono`. */
  tone?: 'strong' | 'muted' | 'mono';
  /** A supporting column that steps out on a narrow screen. */
  hideBelow?: 'md' | 'lg' | 'xl';
};

const TONE = {
  strong: 'font-semibold text-ink',
  muted: 'text-ink-muted',
  mono: 'font-mono text-meta tracking-wide text-ink',
} as const;

const HIDE = {
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
} as const;

const ALIGN = { end: 'text-end', center: 'text-center' } as const;

/** A click on a control inside a row belongs to the control, not the row. */
function fromControl(event: MouseEvent<HTMLElement>): boolean {
  return Boolean((event.target as HTMLElement).closest('a, button, input, select, textarea, [role="menuitem"], [role="option"]'));
}

/**
 * Every list in the panel: a lifted card with its heading and tools, and rows
 * that arrive one after another. Loading, failure and emptiness are states of
 * the table, not wrappers a page has to remember.
 *
 * `rowTo` makes a whole row open its record — a click anywhere but a control
 * follows it, and a chevron link carries it for the keyboard and screen
 * readers. `footer` holds the pager.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading = false,
  isFetching = false,
  error,
  empty,
  title,
  description,
  icon,
  tone,
  actions,
  toolbar,
  footer,
  rowActions,
  rowTo,
  rowLabel,
  rowMuted,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  /** A new page is on its way: the rows step back until it lands. */
  isFetching?: boolean;
  error?: unknown;
  empty: { title: string; hint?: ReactNode; action?: ReactNode; icon?: ReactNode };
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: TagTone;
  actions?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  rowActions?: (row: T) => ReactNode;
  rowTo?: (row: T) => string;
  rowLabel?: (row: T) => string;
  /** A row that no longer counts steps back. */
  rowMuted?: (row: T) => boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const chrome = { title, description, icon, tone, actions, toolbar, className };

  if (error) {
    return (
      <Panel {...chrome}>
        <Callout tone="bad" title="Veri alınamadı">
          <p>{errorMessage(error, 'Liste yüklenemedi.')}</p>
        </Callout>
      </Panel>
    );
  }

  if (!isLoading && rows.length === 0) {
    return (
      <Panel {...chrome} flush>
        <EmptyState title={empty.title} hint={empty.hint} action={empty.action} icon={empty.icon} />
      </Panel>
    );
  }

  const trailing = Boolean(rowActions || rowTo);

  return (
    <Panel {...chrome} footer={footer} flush>
      <div className="overflow-x-auto">
        <table aria-busy={isLoading || isFetching || undefined} className="w-full border-separate border-spacing-0 text-body">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  className={cn(
                    'h-10 whitespace-nowrap border-y border-line-soft bg-sunken/70 px-4 text-start text-micro text-ink-faint first:pl-5 last:pr-5',
                    column.align ? ALIGN[column.align] : undefined,
                    column.hideBelow ? HIDE[column.hideBelow] : undefined,
                  )}
                >
                  {column.header}
                </th>
              ))}
              {trailing ? (
                <th className="w-0 border-y border-line-soft bg-sunken/70 px-4 last:pr-5">
                  <span className="sr-only">İşlemler</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className={cn('transition-opacity duration-200', isFetching && !isLoading && 'opacity-55')}>
            {isLoading
              ? [0, 1, 2, 3, 4].map((row) => (
                  <tr key={row}>
                    {columns.map((column, index) => (
                      <td
                        key={column.key}
                        className={cn('border-b border-line-soft px-4 py-4 first:pl-5 last:pr-5', column.hideBelow ? HIDE[column.hideBelow] : undefined)}
                      >
                        <Skeleton className={cn('h-3.5', index === 0 ? 'w-3/4' : 'w-1/2')} />
                      </td>
                    ))}
                    {trailing ? <td className="border-b border-line-soft px-4 last:pr-5" /> : null}
                  </tr>
                ))
              : rows.map((row, index) => {
                  const to = rowTo?.(row);
                  return (
                    <tr
                      key={rowKey(row)}
                      style={staggered(index)}
                      onClick={
                        to
                          ? (event) => {
                              if (!fromControl(event)) navigate(to);
                            }
                          : undefined
                      }
                      className={cn(
                        'group/row stagger animate-enter transition-colors duration-150 [&:last-child>td]:border-b-0',
                        to ? 'cursor-pointer hover:bg-primary-soft/45' : 'hover:bg-fill/55',
                        rowMuted?.(row) ? '[&>td]:opacity-60' : undefined,
                      )}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            'border-b border-line-soft px-4 py-3 align-middle first:pl-5 last:pr-5',
                            column.align ? ALIGN[column.align] : undefined,
                            column.tone ? TONE[column.tone] : undefined,
                            column.hideBelow ? HIDE[column.hideBelow] : undefined,
                          )}
                        >
                          {column.cell(row, index)}
                        </td>
                      ))}
                      {trailing ? (
                        <td className="whitespace-nowrap border-b border-line-soft px-4 py-3 text-end last:pr-5">
                          <div className="flex items-center justify-end gap-1">
                            {rowActions?.(row)}
                            {to ? (
                              <Link
                                to={to}
                                aria-label={rowLabel?.(row) ?? 'Aç'}
                                className="grid size-8 place-items-center rounded-pill text-ink-faint transition-[background-color,color,translate] duration-200 ease-snap group-hover/row:translate-x-0.5 group-hover/row:bg-raised group-hover/row:text-primary-text"
                              >
                                <ChevronRight className="size-4" />
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
