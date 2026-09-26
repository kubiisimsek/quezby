import { postsOf } from '@quezby/config';
import type { Reel, ReelKind } from '@quezby/engine';

import { lookOf } from '@/game/content';
import { useLanguage } from '@/i18n/language';

function reelOf(kind: ReelKind, index: number): Reel {
  return { index, kind, window: 1500, holdFill: 0, zoneCenter: 500, zoneHalf: 100, drain: 0, level: 1 };
}

describe('lookOf', () => {
  it('dresses a reel in Turkish on a Turkish phone, as it always has', () => {
    expect(lookOf(42, reelOf('like', 3))).toMatchObject({
      postId: 'like-004',
      user: '@ece.su',
      caption: 'tatil fotoğrafı (sonunda)',
      headline: null,
      likes: '7,4 B',
      comments: '747',
    });
  });

  it('speaks the language it is given, counts included', () => {
    expect(lookOf(42, reelOf('like', 3), 'en')).toMatchObject({
      postId: 'like-004',
      user: '@ava.rose',
      caption: 'vacation pic (finally)',
      headline: null,
      likes: '7.4K',
      comments: '747',
    });
  });

  it('follows the language the player picked', () => {
    useLanguage.setState({ locale: 'de' });

    expect(lookOf(42, reelOf('freeze', 1))).toMatchObject({
      postId: 'freeze-003',
      user: '@jetzt.live',
      caption: 'Nicht bewegen. Nicht berühren.',
      headline: 'Die Lehrerin schaut her',
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
      expect(look.user).toBe(post?.user[locale]);
      expect(look.caption).toBe(post?.caption[locale]);
    }
  });
});
