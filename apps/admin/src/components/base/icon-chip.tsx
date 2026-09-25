import type { ReactNode } from 'react';

import type { TagTone } from '@/components/base/tag';
import { cn } from '@/lib/utils';

const TONE: Record<TagTone, string> = {
  neutral: 'bg-fill text-ink-muted',
  primary: 'bg-primary-soft text-primary-text',
  secondary: 'bg-secondary-soft text-secondary-text',
  ok: 'bg-ok-soft text-ok-text',
  warn: 'bg-warn-soft text-warn-text',
  bad: 'bg-bad-soft text-bad-text',
  onBrand: 'bg-on-brand/16 text-on-brand',
};

const SIZE = {
  sm: 'size-7 rounded-control [&_svg]:size-3.5',
  md: 'size-9 rounded-control [&_svg]:size-4.5',
  lg: 'size-11.5 rounded-panel [&_svg]:size-5.5',
} as const;

/** A glyph in a tinted square — what a panel, a tile or a dialog is about. */
export function IconChip({
  icon,
  tone = 'primary',
  size = 'md',
  className,
}: {
  icon: ReactNode;
  tone?: TagTone;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <span aria-hidden className={cn('grid shrink-0 place-items-center [&_svg]:stroke-[1.9]', TONE[tone], SIZE[size], className)}>
      {icon}
    </span>
  );
}
