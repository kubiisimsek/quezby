import { FORMATS_OF, postFor, postsOf } from '@quezby/config';
import type { Reel, ReelKind } from '@quezby/engine';

import { lookOf } from '@/game/content';
import { useLanguage } from '@/i18n/language';

function reelOf(kind: ReelKind, index: number): Reel {
  return { index, kind, window: 1500, holdFill: 0, zoneCenter: 500, zoneHalf: 100, drain: 0, level: 1 };
}

describe('lookOf', () => {
  it('dresses a reel in Turkish on a Turkish phone', () => {
    const post = postFor(42, 3, 'like');
    expect(lookOf(42, reelOf('like', 3))).toMatchObject({
      postId: post.id,
      emoji: post.emoji,
      user: post.user.tr,
      caption: post.caption.tr,
      headline: null,
      likes: '7,4 B',
      comments: '747',
    });
  });

  it('speaks the language it is given, counts included', () => {
    const post = postFor(42, 3, 'like');
    expect(lookOf(42, reelOf('like', 3), 'en')).toMatchObject({
      postId: post.id,
      user: post.user.en,
      caption: post.caption.en,
      headline: null,
      likes: '7.4K',
      comments: '747',
    });
  });

  it('follows the language the player picked', () => {
    useLanguage.setState({ locale: 'de' });
    const post = postFor(42, 1, 'freeze');

    expect(lookOf(42, reelOf('freeze', 1))).toMatchObject({
      postId: post.id,
      user: post.user.de,
      caption: post.caption.de,
      headline: post.headline?.de,
    });
  });

  it('wears the same post in every language: only the words change', () => {
    const reel = reelOf('skip', 7);
    const turkish = lookOf(9, reel, 'tr');
    for (const locale of ['en', 'de', 'ar', 'fr', 'es'] as const) {
      const look = lookOf(9, reel, locale);
      const post = postsOf().get(look.postId);
      expect(look.postId).toBe(turkish.postId);
      expect(look.emoji).toBe(turkish.emoji);
      expect(look.background).toBe(turkish.background);
      expect(look.dress).toEqual(turkish.dress);
      expect(look.media.format).toBe(turkish.media.format);
      expect(look.user).toBe(post?.user[locale]);
      expect(look.caption).toBe(post?.caption[locale]);
    }
  });

  it('draws every post of a long run in a format its kind may wear', () => {
    const kinds: ReelKind[] = ['skip', 'like', 'hold', 'freeze'];
    const worn = new Set<string>();
    for (let index = 0; index < 1200; index += 1) {
      const kind = kinds[index % kinds.length] ?? 'skip';
      const look = lookOf(2026, reelOf(kind, index), 'tr');
      expect(FORMATS_OF[kind]).toContain(look.media.format);
      expect(look.media.format).toBe(postsOf().get(look.postId)?.body.format);
      worn.add(look.media.format);
    }
    expect(worn.size).toBe(new Set(Object.values(FORMATS_OF).flat()).size);
  });
});
