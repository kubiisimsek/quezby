import type { AdminRunStep, AdminVerdict } from '@quezby/types';
import { useState } from 'react';

import { Tag } from '@/components/base/tag';
import { Facts } from '@/components/patterns/facts';
import { formatCombo, formatMs, formatNumber, GESTURE, POST_KIND, VERDICT } from '@/lib/format';
import { cn } from '@/lib/utils';

const CELL: Record<AdminVerdict, string> = {
  hit: 'bg-ok',
  perfect: 'bg-primary',
  timeout: 'bg-bad',
  wrong: 'bg-bad',
  caught: 'bg-bad',
  holdEarly: 'bg-warn',
  holdLate: 'bg-warn',
  drained: 'bg-line-strong',
};

/** The decision time under which too many answers mean a machine — `plausibility.fast_decision_ms`. */
const FAST_MS = 250;

/**
 * A run post by post, as the API's replay judged it: a strip of the decision
 * times of the swipes and likes — a human's wander, a bot's flat line — and
 * a cell per post in the colour of its verdict. A cell opens its post.
 */
export function RunTimeline({ steps }: { steps: AdminRunStep[] }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const step = chosen === null ? null : steps[chosen];

  const decided = steps.filter((one) => one.gesture === 'up' || one.gesture === 'like');
  const slowest = Math.max(FAST_MS * 2, ...decided.map((one) => one.t));
  const fast = decided.filter((one) => one.t < FAST_MS).length;
  // Bars with a gap while they are few; touching once they are too many to part.
  const barWidth = decided.length > 120 ? 1 : 0.7;
  const tally = Object.entries(
    steps.reduce<Partial<Record<AdminVerdict, number>>>((all, one) => ({ ...all, [one.verdict]: (all[one.verdict] ?? 0) + 1 }), {}),
  ) as [AdminVerdict, number][];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {tally.map(([verdict, count]) => (
          <Tag key={verdict} tone={VERDICT[verdict].tone} label={`${VERDICT[verdict].label} ${formatNumber(count)}`} />
        ))}
      </div>

      {decided.length > 0 ? (
        <figure className="space-y-2">
          <figcaption className="flex flex-wrap items-baseline justify-between gap-2 text-micro text-ink-faint">
            <span>Kaydırma ve beğeni kararları (ms)</span>
            <span>
              {formatNumber(fast)} / {formatNumber(decided.length)} karar {FAST_MS} ms’nin altında
            </span>
          </figcaption>
          {/* One unit per decision, stretched to the width: a long run fits whole. */}
          <div aria-hidden className="h-20 rounded-control bg-sunken/70 px-1 pt-1">
            <svg viewBox={`0 0 ${decided.length} 100`} preserveAspectRatio="none" className="block size-full">
              {decided.map((one, index) => {
                const height = Math.max(2, (one.t / slowest) * 100);
                return (
                  <rect
                    key={one.index}
                    x={index + (1 - barWidth) / 2}
                    y={100 - height}
                    width={barWidth}
                    height={height}
                    className={one.t < FAST_MS ? 'fill-bad' : 'fill-secondary/70'}
                  >
                    <title>{`Post ${one.index + 1}: ${one.t} ms`}</title>
                  </rect>
                );
              })}
              <line
                x1={0}
                x2={decided.length}
                y1={100 - (FAST_MS / slowest) * 100}
                y2={100 - (FAST_MS / slowest) * 100}
                vectorEffect="non-scaling-stroke"
                strokeDasharray="4 3"
                className="stroke-bad/60"
              />
            </svg>
          </div>
        </figure>
      ) : null}

      <div role="list" aria-label="Postlar" className="flex flex-wrap gap-1">
        {steps.map((one) => (
          <button
            key={one.index}
            type="button"
            role="listitem"
            aria-pressed={chosen === one.index}
            aria-label={`Post ${one.index + 1}: ${POST_KIND[one.kind].label}, ${VERDICT[one.verdict].label}`}
            title={`Post ${one.index + 1} · ${POST_KIND[one.kind].label} · ${VERDICT[one.verdict].label}`}
            onClick={() => setChosen(chosen === one.index ? null : one.index)}
            className={cn(
              'size-3.5 rounded-[4px] transition-[scale,box-shadow] duration-150 ease-snap hover:scale-125',
              CELL[one.verdict],
              chosen === one.index && 'scale-125 ring-2 ring-ink ring-offset-1 ring-offset-raised',
            )}
          />
        ))}
      </div>

      {step ? (
        <div className="animate-rise rounded-panel bg-sunken/60 p-4">
          <p className="mb-3 flex flex-wrap items-center gap-2 text-heading text-ink">
            Post {step.index + 1}
            <Tag tone="neutral" dot={false} label={`${POST_KIND[step.kind].label} · ${POST_KIND[step.kind].move}`} />
            <Tag tone={VERDICT[step.verdict].tone} label={VERDICT[step.verdict].label} />
          </p>
          <Facts
            facts={[
              { label: 'Seviye', value: formatNumber(step.level) },
              { label: 'Hareket', value: GESTURE[step.gesture] },
              { label: 'Karar anı', value: step.gesture === 'none' ? null : formatMs(step.t), hint: `Pencere ${formatMs(step.window)}` },
              { label: 'Basılı tutma', value: step.d > 0 ? formatMs(step.d) : null },
              { label: 'Puan', value: formatNumber(step.points), hint: step.bonusPoints > 0 ? `+${formatNumber(step.bonusPoints)} bonus` : undefined },
              { label: 'Kombo', value: step.combo > 0 ? formatCombo(step.combo) : null },
              { label: 'Dopamin', value: formatNumber(step.meter) },
            ]}
          />
        </div>
      ) : (
        <p className="text-meta text-ink-muted">Ayrıntısını görmek için bir posta dokun.</p>
      )}
    </div>
  );
}
