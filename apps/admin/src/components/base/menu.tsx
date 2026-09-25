import * as Dropdown from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type MenuItem =
  | {
      label: ReactNode;
      hint?: ReactNode;
      icon: ReactNode;
      onSelect: () => void;
      tone?: 'default' | 'danger';
      disabled?: boolean;
    }
  | 'separator';

/**
 * A menu of actions from a button — a row's "…", the account at the foot of
 * the sidebar. Each item is an icon in a small well, its label and a hint.
 */
export function Menu({
  trigger,
  items,
  header,
  align = 'end',
  side = 'bottom',
  label,
}: {
  trigger: ReactNode;
  items: MenuItem[];
  header?: ReactNode;
  align?: 'start' | 'end';
  side?: 'top' | 'bottom';
  label?: string;
}) {
  return (
    <Dropdown.Root modal={false}>
      <Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          align={align}
          side={side}
          sideOffset={8}
          aria-label={label}
          className="z-50 min-w-60 overflow-hidden rounded-panel bg-overlay p-1.5 shadow-raised data-[state=closed]:animate-menu-out data-[state=open]:animate-menu-in"
        >
          {header ? (
            <>
              <div className="px-2.5 py-2">{header}</div>
              <Dropdown.Separator className="-mx-1.5 my-1 h-px bg-line-soft" />
            </>
          ) : null}
          {items.map((item, index) =>
            item === 'separator' ? (
              <Dropdown.Separator key={`separator-${index}`} className="-mx-1.5 my-1 h-px bg-line-soft" />
            ) : (
              <Dropdown.Item
                key={index}
                disabled={item.disabled}
                onSelect={item.onSelect}
                className={cn(
                  'group/item flex cursor-pointer select-none items-center gap-2.5 rounded-control p-1.5 pr-3 text-body outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45',
                  item.tone === 'danger' ? 'text-bad-text data-[highlighted]:bg-bad-soft' : 'text-ink data-[highlighted]:bg-fill',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-control [&_svg]:size-3.5',
                    item.tone === 'danger'
                      ? 'bg-bad-soft text-bad-text'
                      : 'bg-fill text-ink-muted group-data-[highlighted]/item:bg-overlay group-data-[highlighted]/item:text-primary-text',
                  )}
                >
                  {item.icon}
                </span>
                <span className="grid min-w-0">
                  <span className="truncate font-semibold">{item.label}</span>
                  {item.hint ? <span className="truncate text-micro font-medium text-ink-faint">{item.hint}</span> : null}
                </span>
              </Dropdown.Item>
            ),
          )}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
