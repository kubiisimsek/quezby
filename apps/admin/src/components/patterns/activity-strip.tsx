import { formatDayKey, formatDuration, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export type ActivityDay = { day: string; visits: number; seconds: number };

/** A day's cell: empty when the player never came, greener the longer they stayed. */
function cell(day: ActivityDay): string {
  if (day.visits === 0 && day.seconds === 0) return 'bg-fill';
  if (day.seconds < 5 * 60) return 'border border-ok bg-ok-soft';
  if (day.seconds < 20 * 60) return 'bg-ok/60';
  return 'bg-ok';
}

/** "25 Eyl Cum: 3 ziyaret · 12 dk" — what the cell says to a screen reader and on hover. */
export function describeDay(day: ActivityDay): string {
  return day.visits === 0 && day.seconds === 0
    ? `${formatDayKey(day.day)}: gelmedi`
    : `${formatDayKey(day.day)}: ${formatNumber(day.visits)} ziyaret · ${formatDuration(day.seconds * 1000)}`;
}

/**
 * A player's days, oldest first, one cell each — grey when they did not
 * come, then greener with the time they stayed. Every cell says its day in
 * words, so colour is never the only way to read it.
 */
export function ActivityStrip({ days, label }: { days: ActivityDay[]; label: string }) {
  const first = days[0];
  const last = days[days.length - 1];

  return (
    <figure className="space-y-2">
      <ul aria-label={label} className="flex flex-wrap gap-1">
        {days.map((day) => (
          <li
            key={day.day}
            aria-label={describeDay(day)}
            title={describeDay(day)}
            className={cn('size-4 rounded-[4px]', cell(day))}
          />
        ))}
      </ul>
      {first && last ? (
        <figcaption className="flex justify-between text-micro text-ink-faint">
          <span>{formatDayKey(first.day)}</span>
          <span>Daha koyu: daha uzun kaldı</span>
          <span>{formatDayKey(last.day)}</span>
        </figcaption>
      ) : null}
    </figure>
  );
}
