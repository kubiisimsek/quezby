import type { ReactNode } from 'react';

import { Meter } from '@/components/base/meter';
import type { TagTone } from '@/components/base/tag';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export type Share = {
  key: string;
  label: ReactNode;
  hint?: ReactNode;
  count: number;
  tone?: Exclude<TagTone, 'onBrand' | 'neutral'>;
};

/** How a whole splits: each part's count, its share and a bar — the biggest first. */
export function ShareList({ items, label, className }: { items: Share[]; label: string; className?: string }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const share = new Intl.NumberFormat('tr-TR', { style: 'percent', maximumFractionDigits: 0 });

  return (
    <ul aria-label={label} className={cn('space-y-3.5', className)}>
      {items.map((item, index) => {
        const part = total === 0 ? 0 : item.count / total;
        return (
          <li key={item.key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-body font-semibold text-ink">
                {item.label}
                {item.hint ? <span className="ml-2 text-micro font-medium text-ink-faint">{item.hint}</span> : null}
              </span>
              <span className="shrink-0 text-meta text-ink-muted tabular">
                <span className="font-semibold text-ink">{formatNumber(item.count)}</span> · {share.format(part)}
              </span>
            </div>
            <Meter value={part} tone={item.tone ?? 'primary'} label={typeof item.label === 'string' ? item.label : item.key} index={index} />
          </li>
        );
      })}
    </ul>
  );
}
