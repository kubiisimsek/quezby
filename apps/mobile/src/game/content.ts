import { CONTENT_VERSION, SALT, mix, postFor } from '@quezby/config';
import type { Reel } from '@quezby/engine';
import type { Locale } from '@quezby/types';

import { currentLocale, messagesOf } from '@/i18n';
import { reel as REEL } from '@/ui/tokens';

/**
 * What a reel looks like. None of it reaches the rules — the engine only
 * knows kinds and timings. The post comes from the shared catalog in
 * `@quezby/config`, picked from the seed and the reel's index: the same run
 * always wears the same clothes, and the API makes the same pick to know
 * which posts a player liked. Only its words change with the language.
 */
export type ReelLook = {
  postId: string;
  background: string;
  emoji: string;
  user: string;
  caption: string;
  /** Freeze reels shout a headline instead of a caption. */
  headline: string | null;
  likes: string;
  comments: string;
};

/** A made-up count, shortened the language's way: `842`, `1,2 B`, `1.2K`. */
function count(seed: number, index: number, salt: number, max: number, locale: Locale): string {
  return messagesOf(locale).fmt.compact((mix(seed, index, salt) % max) + 3);
}

function backgroundOf(seed: number, reel: Reel): string {
  switch (reel.kind) {
    case 'skip':
      return REEL.skip[mix(seed, reel.index, SALT.background) % REEL.skip.length] as string;
    case 'like':
      return REEL.like;
    case 'hold':
      return REEL.hold;
    case 'freeze':
      return REEL.freeze;
  }
}

/** The reel in `locale`'s words — the language the game speaks, unless told otherwise. */
export function lookOf(seed: number, reel: Reel, locale: Locale = currentLocale()): ReelLook {
  const post = postFor(seed, reel.index, reel.kind, CONTENT_VERSION);
  return {
    postId: post.id,
    background: backgroundOf(seed, reel),
    emoji: post.emoji,
    user: post.user[locale],
    caption: post.caption[locale],
    headline: post.headline?.[locale] ?? null,
    likes: count(seed, reel.index, SALT.likes, 90000, locale),
    comments: count(seed, reel.index, SALT.comments, 900, locale),
  };
}
