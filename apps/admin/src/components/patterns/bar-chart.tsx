import type { TagTone } from '@/components/base/tag';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export type BarSeries = {
  label: string;
  tone: Exclude<TagTone, 'onBrand' | 'neutral'>;
  values: number[];
};

const FILL: Record<BarSeries['tone'], string> = {
  primary: 'fill-primary',
  secondary: 'fill-secondary',
  ok: 'fill-ok',
  warn: 'fill-warn',
  bad: 'fill-bad',
};

const DOT: Record<BarSeries['tone'], string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
};

/**
 * Days as bars that rise from a hairline baseline, one or more series stacked
 * — the first at the bottom. Colours are roles only; every bar says its
 * numbers on hover, and the same numbers sit in a table for screen readers.
 */
export function BarChart({
  labels,
  series,
  label,
  formatLabel = (value) => value,
  height = 160,
}: {
  /** One per bar, in order — the x axis. */
  labels: string[];
  series: BarSeries[];
  /** What the chart shows, for assistive technology. */
  label: string;
  formatLabel?: (label: string) => string;
  height?: number;
}) {
  const totals = labels.map((_, index) => series.reduce((sum, one) => sum + (one.values[index] ?? 0), 0));
  const max = Math.max(1, ...totals);
  const width = 600;
  const gap = labels.length > 20 ? 4 : 8;
  const bar = (width - gap * (labels.length - 1)) / Math.max(1, labels.length);
  const ticks = [labels[0], labels[Math.floor((labels.length - 1) / 2)], labels[labels.length - 1]].filter(
    (tick, index, all): tick is string => tick !== undefined && all.indexOf(tick) === index,
  );

  return (
    <figure className="space-y-3">
      {series.length > 1 ? (
        <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-micro text-ink-muted">
          {series.map((one) => (
            <span key={one.label} className="inline-flex items-center gap-1.5">
              <span aria-hidden className={cn('size-2 rounded-pill', DOT[one.tone])} />
              {one.label}
            </span>
          ))}
        </figcaption>
      ) : null}
      <svg aria-hidden viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block h-40 w-full overflow-visible">
        {labels.map((day, index) => {
          let base = height;
          const x = index * (bar + gap);
          return (
            <g key={day} className="origin-bottom animate-grow [transform-box:fill-box]" style={{ animationDelay: `${Math.min(index, 20) * 18}ms` }}>
              <title>
                {formatLabel(day)}: {series.map((one) => `${one.label} ${formatNumber(one.values[index] ?? 0)}`).join(' · ')}
              </title>
              {series.map((one, layer) => {
                const value = one.values[index] ?? 0;
                const h = (value / max) * (height - 8);
                base -= h;
                const top = layer === series.length - 1 || series.slice(layer + 1).every((rest) => (rest.values[index] ?? 0) === 0);
                return value > 0 ? (
                  <rect
                    key={one.label}
                    x={x}
                    y={base}
                    width={bar}
                    height={h}
                    rx={top ? Math.min(4, bar / 2) : 0}
                    className={cn(FILL[one.tone], 'opacity-90 transition-opacity hover:opacity-100')}
                  />
                ) : null;
              })}
              <rect x={x} y={0} width={bar} height={height} fill="transparent" />
            </g>
          );
        })}
        <line x1="0" x2={width} y1={height - 0.5} y2={height - 0.5} className="stroke-line" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <div aria-hidden className="flex justify-between text-micro text-ink-faint">
        {ticks.map((tick) => (
          <span key={tick}>{formatLabel(tick)}</span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Gün</th>
            {series.map((one) => (
              <th key={one.label} scope="col">
                {one.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((day, index) => (
            <tr key={day}>
              <th scope="row">{formatLabel(day)}</th>
              {series.map((one) => (
                <td key={one.label}>{formatNumber(one.values[index] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
