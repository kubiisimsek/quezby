import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { IconChip } from '@/components/base/icon-chip';
import type { TagTone } from '@/components/base/tag';
import { cn } from '@/lib/utils';

const SIZE = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
} as const;

/**
 * A dialog that lands on a spring: its icon and title, a body that scrolls
 * on its own, and a footer of actions on a sunken strip. The close button is
 * last in the tab order — whoever opened a dialog came to use it.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  tone = 'primary',
  size = 'sm',
  footer,
  onOpenAutoFocus,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: TagTone;
  size?: keyof typeof SIZE;
  footer?: ReactNode;
  onOpenAutoFocus?: (event: Event) => void;
  children?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim backdrop-blur-sm data-[state=closed]:animate-fade-out data-[state=open]:animate-fade" />
        <Dialog.Content
          onOpenAutoFocus={onOpenAutoFocus}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-overlay bg-overlay shadow-overlay outline-none data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in',
            SIZE[size],
          )}
        >
          <div className="flex items-start gap-3.5 pb-4 pl-6 pr-16 pt-6">
            {icon ? <IconChip icon={icon} tone={tone} size="lg" /> : null}
            <div className="min-w-0 pt-0.5">
              <Dialog.Title className="text-title text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-meta text-ink-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
          </div>
          {children ? <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div> : null}
          {footer ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line-soft bg-sunken/60 px-6 py-4">{footer}</div>
          ) : null}
          <Dialog.Close
            aria-label="Kapat"
            className="absolute right-5 top-5 grid size-8 place-items-center rounded-pill bg-fill text-ink-muted transition-[background-color,scale] duration-150 hover:bg-fill-hover hover:text-ink active:scale-90"
          >
            <X className="size-4" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
