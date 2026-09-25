import * as Tooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

/** A few words about what is under the pointer. */
export function Hint({ content, side = 'top', children }: { content: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right'; children: ReactNode }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={6}
          className="z-50 max-w-72 rounded-panel bg-overlay px-3 py-2 text-meta text-ink shadow-raised data-[state=delayed-open]:animate-menu-in"
        >
          {content}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
