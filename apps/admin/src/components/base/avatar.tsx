import type { TagTone } from '@/components/base/tag';
import { cn } from '@/lib/utils';

const TONE: Record<Exclude<TagTone, 'onBrand'>, string> = {
  neutral: 'bg-fill text-ink-muted',
  primary: 'bg-primary-soft text-primary-text',
  secondary: 'bg-secondary-soft text-secondary-text',
  ok: 'bg-ok-soft text-ok-text',
  warn: 'bg-warn-soft text-warn-text',
  bad: 'bg-bad-soft text-bad-text',
};

const SIZE = {
  sm: 'size-7.5 text-micro',
  md: 'size-9.5 text-meta',
  lg: 'size-12 text-heading',
  xl: 'size-16 text-title',
} as const;

/** Two letters for a name — `kerem.35` → KE, `Ekin Aydın` → EA — in Turkish capitals. */
export function initials(name: string | null | undefined): string {
  const words = (name ?? '').split(/[\s._*\-@]+/).filter((word) => /\p{L}/u.test(word));
  const letters =
    words.length >= 2
      ? `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}`
      : (words[0] ?? name ?? '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2);
  return letters.toLocaleUpperCase('tr-TR') || '?';
}

/** A person as two letters in a tinted disc. */
export function Avatar({
  name,
  tone = 'secondary',
  size = 'md',
  className,
}: {
  name: string | null | undefined;
  tone?: Exclude<TagTone, 'onBrand'>;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <span aria-hidden className={cn('grid shrink-0 select-none place-items-center rounded-pill font-bold', TONE[tone], SIZE[size], className)}>
      {initials(name)}
    </span>
  );
}
