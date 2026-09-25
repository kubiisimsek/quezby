import { useRef, type KeyboardEvent, type ReactNode } from 'react';

import { useSlidingThumb } from '@/hooks/useSlidingThumb';
import { cn } from '@/lib/utils';

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
  /** When the label is an icon only. */
  'aria-label'?: string;
};

/**
 * A row of choices with a pill that springs to the chosen one. `tabs` switch
 * a page's views (a tablist); `choice` picks a value (a radio group — the
 * theme, a role). `canvas` sits on the page; `brand` on the brand band.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  kind = 'tabs',
  variant = 'canvas',
  'aria-label': ariaLabel,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  kind?: 'tabs' | 'choice';
  variant?: 'canvas' | 'brand';
  'aria-label': string;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const thumb = useSlidingThumb(track, '[data-chosen]', `${value}|${options.length}`);
  const onBrand = variant === 'brand';

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + step + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    track.current?.querySelector<HTMLButtonElement>(`[data-value="${CSS.escape(next.value)}"]`)?.focus();
  };

  return (
    <div
      ref={track}
      role={kind === 'tabs' ? 'tablist' : 'radiogroup'}
      aria-label={ariaLabel}
      onKeyDown={move}
      className={cn(
        'relative inline-flex w-max rounded-control p-0.75',
        onBrand ? 'bg-on-brand/10' : 'border border-line bg-fill',
        className,
      )}
    >
      {thumb ? (
        <span
          aria-hidden
          className={cn(
            'absolute left-0 top-0 rounded-[calc(var(--radius-control)-3px)]',
            onBrand ? 'bg-on-brand/22' : 'bg-surface shadow-card',
            thumb.animate && 'transition-[translate,width] duration-520 ease-spring',
          )}
          style={{ translate: `${thumb.x}px ${thumb.y}px`, width: thumb.width, height: thumb.height }}
        />
      ) : null}
      {options.map((option) => {
        const chosen = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role={kind === 'tabs' ? 'tab' : 'radio'}
            aria-selected={kind === 'tabs' ? chosen : undefined}
            aria-checked={kind === 'choice' ? chosen : undefined}
            aria-label={option['aria-label']}
            tabIndex={chosen ? 0 : -1}
            data-chosen={chosen || undefined}
            data-value={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative z-10 inline-flex h-8.5 items-center justify-center gap-2 rounded-[calc(var(--radius-control)-3px)] px-3.5 text-meta font-semibold whitespace-nowrap transition-colors duration-150 [&_svg]:size-4',
              onBrand
                ? chosen
                  ? 'text-on-brand'
                  : 'text-on-brand/75 hover:text-on-brand'
                : chosen
                  ? 'text-ink [&_svg]:text-primary-text'
                  : 'text-ink-muted hover:text-ink',
              option.label === undefined || option.label === null ? 'w-8 px-0' : undefined,
            )}
          >
            {option.icon}
            {option.label}
            {option.count !== undefined ? (
              <span
                className={cn(
                  'min-w-5 rounded-pill px-1.5 text-micro tabular',
                  onBrand ? 'bg-on-brand/18' : chosen ? 'bg-primary-soft text-primary-text' : 'bg-fill-hover text-ink-faint',
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
