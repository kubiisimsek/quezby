import type { ReactNode } from 'react';

import { IconChip } from '@/components/base/icon-chip';
import { cn, staggered } from '@/lib/utils';

export type BandStat = {
  label: ReactNode;
  value: ReactNode;
  icon: ReactNode;
  /** Something here needs a look: the tile lights up. */
  alert?: boolean;
};

/** The page's headline numbers, as glass tiles on the brand band. */
export function BandStats({ stats }: { stats: BandStat[] }) {
  return (
    <dl className="flex flex-wrap gap-2.5">
      {stats.map((stat, index) => (
        <div
          key={index}
          style={staggered(index)}
          className={cn(
            'stagger flex min-w-36 flex-1 animate-enter items-center gap-3 rounded-panel border px-3.5 py-2.5 backdrop-blur-sm sm:flex-none',
            stat.alert ? 'border-on-brand/40 bg-on-brand/20' : 'border-on-brand/14 bg-on-brand/10',
          )}
        >
          <IconChip icon={stat.icon} tone="onBrand" size="sm" />
          <div className="flex min-w-0 flex-col-reverse">
            <dt className="truncate text-micro text-on-brand/85">{stat.label}</dt>
            <dd className="truncate text-title tabular">{stat.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
