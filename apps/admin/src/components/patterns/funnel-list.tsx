import type { ReactNode } from 'react';

import { Meter } from '@/components/base/meter';
import { formatNumber, formatPerMille } from '@/lib/format';
import { cn } from '@/lib/utils';

export type FunnelStep = {
  key: string;
  label: ReactNode;
  hint?: ReactNode;
  count: number;
  /** Per-mille, from the API: of those who could have taken the step. */
  rate: number | null;
};

/**
 * Rows with a count and a rate the API worked out — per-mille, never here —
 * on a bar of that length: a funnel's steps in order, numbered, or slices
 * of a whole the API already divided. Unlike `ShareList`, nothing is summed.
 */
export function FunnelList({
  steps,
  label,
  numbered = true,
  tone = 'ok',
  className,
}: {
  steps: FunnelStep[];
  label: string;
  /** Steps taken one after another are numbered; slices of a whole are not. */
  numbered?: boolean;
  tone?: 'ok' | 'secondary';
  className?: string;
}) {
  const List = numbered ? 'ol' : 'ul';
  return (
    <List aria-label={label} className={cn('space-y-3.5', className)}>
      {steps.map((step, index) => (
        <li key={step.key} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-body font-semibold text-ink">
              {numbered ? <span className="mr-2 text-micro text-ink-faint tabular">{index + 1}</span> : null}
              {step.label}
              {step.hint ? <span className="ml-2 text-micro font-medium text-ink-faint">{step.hint}</span> : null}
            </span>
            <span className="shrink-0 text-meta text-ink-muted tabular">
              <span className="font-semibold text-ink">{formatNumber(step.count)}</span> · {formatPerMille(step.rate)}
            </span>
          </div>
          <Meter
            value={(step.rate ?? 0) / 1000}
            tone={tone}
            label={typeof step.label === 'string' ? step.label : step.key}
            index={index}
          />
        </li>
      ))}
    </List>
  );
}
