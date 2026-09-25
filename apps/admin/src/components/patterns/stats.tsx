import type { ReactNode } from 'react';

import { IconChip } from '@/components/base/icon-chip';
import type { TagTone } from '@/components/base/tag';
import { cn, staggered } from '@/lib/utils';

export type Stat = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
  tone?: TagTone;
  footer?: ReactNode;
};

/** Numbers on the canvas: a row of lifted tiles, each value popping in. */
export function Stats({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {stats.map((stat, index) => (
        <div key={index} style={staggered(index)} className="stagger flex animate-enter flex-col rounded-panel bg-raised p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <p className="text-micro text-ink-faint">{stat.label}</p>
            <IconChip icon={stat.icon} tone={stat.tone ?? 'primary'} />
          </div>
          <p className="mt-1 animate-pop text-display text-ink tabular">{stat.value}</p>
          {stat.hint ? <p className="text-meta text-ink-muted">{stat.hint}</p> : null}
          {stat.footer ? <div className="mt-3">{stat.footer}</div> : null}
        </div>
      ))}
    </div>
  );
}
