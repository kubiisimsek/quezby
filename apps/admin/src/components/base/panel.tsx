import type { ReactNode } from 'react';

import { IconChip } from '@/components/base/icon-chip';
import type { TagTone } from '@/components/base/tag';
import { cn } from '@/lib/utils';

/**
 * A card: lifted by its shadow, never bordered. The heading names what is in
 * it; `toolbar` holds a list's search and filters; `flush` gives the body to
 * a table edge to edge.
 */
export function Panel({
  title,
  description,
  icon,
  tone = 'primary',
  actions,
  toolbar,
  footer,
  flush = false,
  className,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: TagTone;
  actions?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  flush?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const header = title || actions;

  return (
    <section className={cn('overflow-hidden rounded-panel bg-raised shadow-card', className)}>
      {header ? (
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-4">
          <div className="flex min-w-0 items-center gap-3">
            {icon ? <IconChip icon={icon} tone={tone} /> : null}
            <div className="min-w-0">
              {title ? <h2 className="text-heading text-ink">{title}</h2> : null}
              {description ? <p className="text-meta text-ink-muted">{description}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {toolbar ? <div className="flex flex-wrap items-center gap-2.5 px-5 pb-4">{toolbar}</div> : null}
      {children !== undefined ? <div className={cn(flush ? undefined : 'px-5 pb-5', !header && !flush && 'pt-5')}>{children}</div> : null}
      {footer ? <footer className="border-t border-line-soft bg-sunken/60 px-5 py-3">{footer}</footer> : null}
    </section>
  );
}
