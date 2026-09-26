import { isAnalyticsScreen } from '@quezby/config';
import type { AdminVisit } from '@quezby/types';
import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';

import { Tag } from '@/components/base/tag';
import { ANALYTICS_EVENT, ANALYTICS_SCREEN, formatDuration } from '@/lib/format';

/**
 * Where a visit went, in order: screens as quiet chips joined by arrows, the
 * moments between them as tags in their own colour. The first `max` steps
 * show; the rest is a count. Each step says when it came, on hover.
 */
export function Journey({ steps, max = 12 }: { steps: AdminVisit['journey']; max?: number }) {
  if (steps.length === 0) return <span className="text-meta text-ink-faint">Yolculuk yok</span>;
  const shown = steps.slice(0, max);

  return (
    <ol aria-label="Yolculuk" className="flex flex-wrap items-center gap-1">
      {shown.map((step, index) => {
        const when = `${formatDuration(step.at * 1000)} sonra`;
        return (
          <Fragment key={`${step.code}-${index}`}>
            {index > 0 && isAnalyticsScreen(step.code) ? (
              <ChevronRight aria-hidden className="size-3 shrink-0 text-ink-faint" />
            ) : null}
            <li title={when}>
              {isAnalyticsScreen(step.code) ? (
                <span className="inline-flex rounded-pill bg-fill px-2 py-0.5 text-micro text-ink-muted">
                  {ANALYTICS_SCREEN[step.code]}
                </span>
              ) : (
                <Tag tone={ANALYTICS_EVENT[step.code].tone} label={ANALYTICS_EVENT[step.code].label} />
              )}
            </li>
          </Fragment>
        );
      })}
      {steps.length > shown.length ? (
        <li className="text-micro text-ink-faint">+{steps.length - shown.length} adım</li>
      ) : null}
    </ol>
  );
}
