import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

/** What is missing and what to do about it — never just "no data". */
export function EmptyState({ title, hint, icon, action }: { title: ReactNode; hint?: ReactNode; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span
        aria-hidden
        className="mb-4 grid size-17 animate-settle place-items-center rounded-overlay bg-tint-wash text-primary-text [&_svg]:size-6.5 [&_svg]:stroke-[1.7]"
      >
        {icon ?? <Inbox />}
      </span>
      <p className="text-title text-ink">{title}</p>
      {hint ? <p className="mt-1.5 max-w-sm text-meta text-ink-muted">{hint}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
