import type { AdminPushMessage } from '@quezby/types';

import { BrandMark } from '@/components/base/brand-mark';
import { cn } from '@/lib/utils';

const DAY = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Istanbul' });
const TIME = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });

/**
 * A push as a player sees it: a lock screen on the game's colours with the
 * notification on it — the game's mark, its name, "şimdi", the title and the
 * words, right to left where the words are.
 */
export function NotificationPreview({ message, className, now = new Date() }: { message: AdminPushMessage; className?: string; now?: Date }) {
  return (
    <figure
      aria-label="Kilit ekranında görünüşü"
      className={cn('relative overflow-hidden rounded-overlay bg-brand-wash px-4 pb-10 pt-6 shadow-brand', className)}
    >
      <div aria-hidden className="mb-6 text-center text-on-brand">
        <p className="text-meta font-semibold text-on-brand/80">{DAY.format(now)}</p>
        <p className="text-hero tabular">{TIME.format(now)}</p>
      </div>
      <div className="rounded-panel bg-surface/90 p-3.5 shadow-raised backdrop-blur-md">
        <div className="mb-1.5 flex items-center gap-2">
          <BrandMark size="sm" className="size-5 rounded-[6px] text-micro shadow-none" />
          <span className="flex-1 text-micro text-ink-muted">Quezby</span>
          <span className="text-micro text-ink-faint">şimdi</span>
        </div>
        <p dir="auto" className="break-words text-body font-bold text-ink">
          {message.title.trim() || 'Başlık'}
        </p>
        <p dir="auto" className="whitespace-pre-line break-words text-body text-ink">
          {message.body.trim() || 'Mesajın burada görünür.'}
        </p>
      </div>
    </figure>
  );
}
