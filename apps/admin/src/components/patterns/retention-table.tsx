import { formatNumber, formatPerMille } from '@/lib/format';
import { cn } from '@/lib/utils';

export type RetentionDay = 'd1' | 'd3' | 'd7' | 'd14' | 'd30';

export type RetentionRow = { week: string; players: number } & Record<RetentionDay, number | null>;

const DAYS: Array<{ key: RetentionDay; label: string }> = [
  { key: 'd1', label: '1. gün' },
  { key: 'd3', label: '3. gün' },
  { key: 'd7', label: '7. gün' },
  { key: 'd14', label: '14. gün' },
  { key: 'd30', label: '30. gün' },
];

/** How strongly a cell is tinted: the more came back, the greener — and the number says it too. */
function tint(perMille: number): string {
  if (perMille >= 500) return 'bg-ok/45 text-ink';
  if (perMille >= 250) return 'bg-ok/30 text-ink';
  if (perMille >= 100) return 'bg-ok/18 text-ink';
  if (perMille > 0) return 'bg-ok/8 text-ink';
  return 'text-ink-muted';
}

/**
 * Cohorts by the week they joined, newest first: how many started, and how
 * many of them came back on day 1, 3, 7, 14 and 30 — per-mille from the API,
 * written out in every cell, the cell only greener for more. A day not over
 * yet for anyone in the week is a dash.
 */
export function RetentionTable({
  rows,
  label,
  formatWeek,
}: {
  rows: RetentionRow[];
  /** What the table shows, for assistive technology. */
  label: string;
  formatWeek: (week: string) => string;
}) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[34rem] border-separate border-spacing-1 text-body">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr className="text-micro text-ink-faint">
            <th scope="col" className="px-2 py-1 text-start font-semibold">
              Hafta
            </th>
            <th scope="col" className="px-2 py-1 text-end font-semibold">
              Oyuncu
            </th>
            {DAYS.map((day) => (
              <th key={day.key} scope="col" className="px-2 py-1 text-center font-semibold">
                {day.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.week}>
              <th scope="row" className="whitespace-nowrap px-2 py-1.5 text-start font-semibold text-ink">
                {formatWeek(row.week)}
              </th>
              <td className="px-2 py-1.5 text-end text-ink-muted">{formatNumber(row.players)}</td>
              {DAYS.map((day) => {
                const value = row.players > 0 ? row[day.key] : null;
                return (
                  <td
                    key={day.key}
                    className={cn(
                      'rounded-control px-2 py-1.5 text-center font-semibold',
                      value === null ? 'text-ink-faint' : tint(value),
                    )}
                  >
                    {formatPerMille(value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
