import { ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type AccordionItem = {
  key: string;
  title: ReactNode;
  /** What is chosen inside, in a few words — read while the item is closed. */
  summary?: ReactNode;
  /** The item holds a choice: its summary stands out. */
  active?: boolean;
  icon?: ReactNode;
  content: ReactNode;
};

/**
 * Sections that open and close one by one, each saying what it holds while
 * closed. Any number can be open at once; the height eases open (off with
 * reduced motion).
 */
export function Accordion({ items, defaultOpen = [], className }: { items: AccordionItem[]; defaultOpen?: string[]; className?: string }) {
  const [open, setOpen] = useState<string[]>(defaultOpen);
  const id = useId();

  return (
    <div className={cn('divide-y divide-line-soft', className)}>
      {items.map((item) => {
        const expanded = open.includes(item.key);
        const header = `${id}-${item.key}-header`;
        const panel = `${id}-${item.key}-panel`;
        return (
          <div key={item.key}>
            <h3>
              <button
                type="button"
                id={header}
                aria-expanded={expanded}
                aria-controls={panel}
                onClick={() => setOpen((current) => (current.includes(item.key) ? current.filter((key) => key !== item.key) : [...current, item.key]))}
                className="group flex w-full items-center gap-3 py-3.5 text-start"
              >
                {item.icon ? (
                  <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-control bg-fill text-ink-muted [&_svg]:size-4">
                    {item.icon}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold text-ink">{item.title}</span>
                  {item.summary ? (
                    <span className={cn('block truncate text-meta', item.active ? 'font-semibold text-primary-text' : 'text-ink-muted')}>{item.summary}</span>
                  ) : null}
                </span>
                <ChevronDown
                  aria-hidden
                  className={cn('size-4 shrink-0 text-ink-faint transition-transform duration-300 ease-spring', expanded && 'rotate-180')}
                />
              </button>
            </h3>
            <div
              id={panel}
              role="region"
              aria-labelledby={header}
              hidden={!expanded}
              className={cn('animate-enter pb-4', item.icon && 'pl-11')}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
