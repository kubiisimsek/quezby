import type { ReactNode } from 'react';

import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export type Chip<T extends string> = { value: T; label: ReactNode; count?: number; icon?: ReactNode };

/**
 * One filter over a list, as pills with their counts. The first chip is
 * "everything"; a chip with nothing behind it steps out unless it is chosen.
 */
export function FilterChips<T extends string>({
  value,
  onChange,
  chips,
  'aria-label': ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  chips: Chip<T>[];
  'aria-label': string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap items-center gap-1.5">
      {chips
        .filter((chip, index) => index === 0 || chip.value === value || chip.count === undefined || chip.count > 0)
        .map((chip) => {
          const on = chip.value === value;
          return (
            <button
              key={chip.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(chip.value)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-pill px-3 text-meta font-semibold transition-[background-color,color,scale] duration-150 ease-snap active:scale-95 [&_svg]:size-3.5',
                on ? 'bg-primary text-primary-ink shadow-primary' : 'bg-fill text-ink-muted hover:bg-fill-hover hover:text-ink',
              )}
            >
              {chip.icon}
              {chip.label}
              {chip.count !== undefined ? (
                <span className={cn('min-w-5 rounded-pill px-1.5 text-micro tabular', on ? 'bg-primary-ink/20' : 'bg-fill-hover text-ink-faint')}>
                  {formatNumber(chip.count)}
                </span>
              ) : null}
            </button>
          );
        })}
    </div>
  );
}
