import { useState } from 'react';

import type { TagTone } from '@/components/base/tag';
import { cn } from '@/lib/utils';

const TONE: Record<TagTone, string> = {
  neutral: 'bg-fill text-ink-muted',
  primary: 'bg-primary-soft text-primary-text',
  secondary: 'bg-secondary-soft text-secondary-text',
  ok: 'bg-ok-soft text-ok-text',
  warn: 'bg-warn-soft text-warn-text',
  bad: 'bg-bad-soft text-bad-text',
  onBrand: 'bg-on-brand/16 text-on-brand',
};

const SIZE = {
  sm: 'size-7.5 text-micro',
  md: 'size-9.5 text-meta',
  lg: 'size-12 text-heading',
  xl: 'size-16 text-title',
  '2xl': 'size-32 text-display',
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

/**
 * A person as their photo in a disc — a player's, as other players see it —
 * or as two letters in a tinted one when there is none, or it will not load.
 * The name always stands beside it, so it is decoration unless `alt` names
 * the photo: where the photo itself is what is being looked at.
 */
export function Avatar({
  name,
  src,
  alt,
  tone = 'secondary',
  size = 'md',
  className,
}: {
  name: string | null | undefined;
  /** The photo's address; initials when null or when it fails to load. */
  src?: string | null;
  /** What the photo is, for a screen reader; decoration without it. */
  alt?: string;
  tone?: TagTone;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const [broken, setBroken] = useState<string | null>(null);

  if (src && broken !== src) {
    return (
      <img
        src={src}
        alt={alt ?? ''}
        aria-hidden={alt ? undefined : true}
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => setBroken(src)}
        className={cn('shrink-0 select-none rounded-pill bg-fill object-cover', SIZE[size], className)}
      />
    );
  }

  return (
    <span aria-hidden className={cn('grid shrink-0 select-none place-items-center rounded-pill font-bold', TONE[tone], SIZE[size], className)}>
      {initials(name)}
    </span>
  );
}
