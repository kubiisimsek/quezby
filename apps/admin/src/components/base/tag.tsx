import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type TagTone = 'neutral' | 'primary' | 'secondary' | 'ok' | 'warn' | 'bad' | 'onBrand';

const TONE: Record<TagTone, string> = {
  neutral: 'bg-fill text-ink-muted',
  primary: 'bg-primary-soft text-primary-text',
  secondary: 'bg-secondary-soft text-secondary-text',
  ok: 'bg-ok-soft text-ok-text',
  warn: 'bg-warn-soft text-warn-text',
  bad: 'bg-bad-soft text-bad-text',
  onBrand: 'bg-on-brand/16 text-on-brand',
};

/**
 * A status or a kind, as a soft pill. Status is never colour alone: the
 * label says it, and a dot (or an icon) leads it.
 */
export function Tag({
  tone = 'neutral',
  label,
  icon,
  dot = true,
  className,
  title,
}: {
  tone?: TagTone;
  label: ReactNode;
  icon?: ReactNode;
  dot?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-pill px-2 py-1 text-micro [&_svg]:size-3 [&_svg]:shrink-0 [&_svg]:stroke-[2.4]',
        TONE[tone],
        className,
      )}
    >
      {icon ?? (dot ? <span aria-hidden className="size-1.5 shrink-0 rounded-pill bg-current" /> : null)}
      <span className="truncate">{label}</span>
    </span>
  );
}
