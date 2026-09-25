import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type Fact = { label: ReactNode; value: ReactNode; hint?: ReactNode };

/** A record's details, a label and a value per row; a missing value is a dash. */
export function Facts({ facts, className }: { facts: Fact[]; className?: string }) {
  return (
    <dl className={cn('divide-y divide-line-soft', className)}>
      {facts.map((fact, index) => (
        <div key={index} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
          <dt className="shrink-0 text-meta text-ink-muted">{fact.label}</dt>
          <dd className="min-w-0 text-end text-body font-semibold text-ink">
            <span className="break-words">{fact.value === null || fact.value === undefined || fact.value === '' ? '—' : fact.value}</span>
            {fact.hint ? <span className="block text-micro font-medium text-ink-faint">{fact.hint}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
