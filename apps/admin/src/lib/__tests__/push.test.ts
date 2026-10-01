import { describe, expect, it } from 'vitest';

import { describeFilters, filtersOf, NO_CHOICE, NO_WORDS, untitledOf, writtenOf } from '@/lib/push';

describe('push filters', () => {
  it('leave out what was not chosen', () => {
    expect(filtersOf({ ...NO_CHOICE, username: ' @Ayse ', played: 'within:3', joined: '30' })).toEqual({ username: 'Ayse', playedWithinDays: 3, joinedWithinDays: 30 });
    expect(filtersOf({ ...NO_CHOICE, played: 'idle:14' })).toEqual({ notPlayedForDays: 14 });
  });

  it('say themselves in words', () => {
    expect(describeFilters({})).toBe('Herkes');
    expect(describeFilters({ tiers: ['diamond', 'none'], daily: 'not_played', platform: 'android', locales: ['tr'] })).toBe(
      'Elmas, Ligi yok · Bugün Günün akışını oynamadı · Android · Türkçe',
    );
  });
});

describe('push words', () => {
  it('count a language written once it has a title and words', () => {
    const words = { ...NO_WORDS, tr: { title: 'Quezby', body: 'Merhaba' }, de: { title: '', body: 'Hallo' }, ar: { title: 'Quezby', body: '  ' }, fr: { title: 'Q', body: 'Salut' } };
    expect(writtenOf(words)).toEqual(['tr', 'fr']);
    expect(untitledOf(words)).toEqual(['de']);
  });
});
