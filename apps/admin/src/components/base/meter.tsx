import type { TagTone } from '@/components/base/tag';
import { cn } from '@/lib/utils';

const TONE: Record<Exclude<TagTone, 'onBrand' | 'neutral'>, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
};

/** How much of something, as a bar that fills in from the left. `value` is 0–1. */
export function Meter({
  value,
  tone = 'primary',
  label,
  className,
  index = 0,
}: {
  value: number;
  tone?: keyof typeof TONE;
  label: string;
  className?: string;
  index?: number;
}) {
  const share = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(share * 100)}
      className={cn('h-1.5 overflow-hidden rounded-pill bg-fill', className)}
    >
      <div
        className={cn('h-full origin-left animate-fill rounded-pill', TONE[tone])}
        style={{ width: `${share * 100}%`, animationDelay: `${Math.min(index, 6) * 45}ms` }}
      />
    </div>
  );
}
