import type { Phrase } from '@quezby/types';

/**
 * What friends can say to each other: a closed list of phrases, sent as
 * codes. No typed word ever travels between players, so nothing needs
 * filtering or moderating; each phone says a phrase in its own language
 * (`t.inbox.phrases`), and the API's push in the receiver's
 * (`lang/{locale}/phrases.php`). The API's twin is `App\Enums\Phrase`, tested
 * against `fixtures/social.json`. Codes are only ever added, never renamed.
 */
const PHRASE_CODES: Record<Phrase, true> = {
  gg: true,
  rematch: true,
  beat_that: true,
  wow: true,
  close_one: true,
  your_turn: true,
  daily: true,
  hi: true,
  thanks: true,
  next_time: true,
};

/** In the order the phrase tray shows them. */
export const PHRASES = Object.keys(PHRASE_CODES) as Phrase[];

export function isPhrase(value: string): value is Phrase {
  return Object.prototype.hasOwnProperty.call(PHRASE_CODES, value);
}

/**
 * A profile photo as the API keeps it: a square JPEG, `size` pixels a side,
 * never more than `maxBytes` (100 KB). The phone crops, scales and squeezes a
 * photo to fit before it sends it; the API re-encodes whatever arrives — which
 * also strips its EXIF, location included — and keeps it only when it fits
 * (`config/quezby.php` › `avatars`).
 */
export const AVATAR = {
  size: 512,
  maxBytes: 100 * 1024,
  /** The JPEG qualities the phone tries, best first, until the photo fits. */
  qualities: [0.85, 0.75, 0.65, 0.55, 0.45] as readonly number[],
  /** Smaller than this a side, and a photo is refused: it would only blur. */
  minSide: 128,
} as const;
