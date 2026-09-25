import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const TONE = {
  info: { box: 'border-secondary-line bg-secondary-soft text-secondary-text', well: 'bg-secondary-text/12', icon: <Info /> },
  ok: { box: 'border-ok-line bg-ok-soft text-ok-text', well: 'bg-ok-text/12', icon: <CircleCheck /> },
  warn: { box: 'border-warn-line bg-warn-soft text-warn-text', well: 'bg-warn-text/12', icon: <TriangleAlert /> },
  bad: { box: 'border-bad-line bg-bad-soft text-bad-text', well: 'bg-bad-text/12', icon: <CircleAlert /> },
} as const;

/** A short message in the flow of a page: something to know, to check, or that went wrong. */
export function Callout({
  tone = 'info',
  title,
  icon,
  action,
  className,
  children,
}: {
  tone?: keyof typeof TONE;
  title?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const style = TONE[tone];
  return (
    <div role={tone === 'bad' ? 'alert' : undefined} className={cn('flex animate-rise gap-3 rounded-panel border px-4 py-3.5 text-meta', style.box, className)}>
      <span aria-hidden className={cn('grid size-7 shrink-0 place-items-center rounded-pill [&_svg]:size-4', style.well)}>
        {icon ?? style.icon}
      </span>
      <div className="min-w-0 flex-1 space-y-1 pt-0.5">
        {title ? <p className="text-heading">{title}</p> : null}
        {children ? <div className="space-y-1 font-medium">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}
