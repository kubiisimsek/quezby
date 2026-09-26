import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CATALOGS, CONTENT_VERSION, SALT, mix, postFor, postsOf, type ContentKind } from '../content';
import { buildContent, buildPace } from '../fixtures';
import { LOCALES } from '../locales';
import { validateUsername } from '../username';

const read = (name: string): unknown =>
  JSON.parse(readFileSync(join(__dirname, '..', '..', 'fixtures', name), 'utf8'));

describe('content catalog', () => {
  it('gives every post a unique id made of its kind and place', () => {
    for (const catalog of Object.values(CATALOGS)) {
      const ids = Object.values(catalog).flat().map((post) => post.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const [kind, posts] of Object.entries(catalog)) {
        posts.forEach((post, i) => expect(post.id).toBe(`${kind}-${String(i + 1).padStart(3, '0')}`));
      }
    }
  });

  it('shouts a headline only on freeze reels', () => {
    const catalog = CATALOGS[CONTENT_VERSION]!;
    expect(catalog.freeze.every((post) => post.headline !== null)).toBe(true);
    for (const kind of ['skip', 'like', 'hold'] as const) {
      expect(catalog[kind].every((post) => post.headline === null)).toBe(true);
    }
  });

  it('picks the same post for the same seed and reel, from the right list', () => {
    expect(postFor(42, 7, 'like')).toEqual(postFor(42, 7, 'like'));
    expect(postFor(42, 7, 'like').id).toMatch(/^like-\d{3}$/);
    expect(postFor(42, 7, 'freeze').id).toMatch(/^freeze-\d{3}$/);
  });

  it('spreads picks over the whole list', () => {
    const seen = new Set<string>();
    for (let index = 0; index < 400; index += 1) seen.add(postFor(2024, index, 'skip').id);
    expect(seen.size).toBe(CATALOGS[CONTENT_VERSION]!.skip.length);
  });

  it('refuses a catalog version it does not have', () => {
    expect(() => postFor(1, 1, 'skip', 99)).toThrow(/catalog v99/);
    expect(() => postsOf(99)).toThrow(/catalog v99/);
  });

  it('finds posts by id', () => {
    expect(postsOf().get('like-001')?.user.tr).toBe('@zeynep.k');
  });

  it('keeps every published post in its place: an id always names the same post', () => {
    const emojis = (kind: ContentKind) => CATALOGS[1]![kind].map((post) => post.emoji).join(' ');
    expect(emojis('skip')).toBe('☕️ 🍝 🧊 🔁 ⏱️ 📉 🧦 🚌 🥬 📺 🎵 🛋️ 🧾 🌧️ 🥪 🗂️ 🥱 🪴');
    expect(emojis('like')).toBe('🐱 🎂 🍳 🏖️ 🐶 💇 🎤 🥟 🐰 🦦');
    expect(emojis('hold')).toBe('💎 👑 🍀 🏆 ⏳ 🪙');
    expect(emojis('freeze')).toBe('👀 🫣 👩‍🏫 🧍 🚨');
  });

  it('hashes like the app always has', () => {
    expect(mix(0, 0, 0)).toBe(mix(0, 0, 0));
    expect(mix(1, 2, SALT.post)).not.toBe(mix(1, 2, SALT.background));
    for (let i = 0; i < 1000; i += 1) {
      const value = mix(i * 7919, i, SALT.post);
      expect(Number.isInteger(value) && value >= 0 && value < 2 ** 32).toBe(true);
    }
  });
});

describe('content words', () => {
  const posts = Object.values(CATALOGS).flatMap((catalog) => Object.values(catalog).flat());
  /** What a post says: its caption and, on a freeze reel, its headline. */
  const lines = posts.flatMap((post) => (post.headline ? [post.caption, post.headline] : [post.caption]));

  it('says every post in all six languages, and only in them', () => {
    for (const post of posts) {
      for (const words of [post.user, post.caption, ...(post.headline ? [post.headline] : [])]) {
        expect(Object.keys(words).sort()).toEqual([...LOCALES].sort());
        for (const locale of LOCALES) expect(words[locale].trim(), `${post.id} · ${locale}`).not.toBe('');
      }
    }
  });

  it('writes every handle as a name a player could pick', () => {
    for (const post of posts) {
      for (const locale of LOCALES) {
        const handle = post.user[locale];
        expect(handle).toMatch(/^@[a-z0-9.*]+$/);
        expect(validateUsername(handle.slice(1)).ok, handle).toBe(true);
      }
    }
  });

  it('keeps an account one person: the same handle in every post it makes', () => {
    const accounts = new Map(posts.map((post) => [post.user.tr, post.user]));
    for (const post of posts) expect(post.user).toEqual(accounts.get(post.user.tr));
    for (const locale of LOCALES) {
      expect(new Set([...accounts.values()].map((user) => user[locale])).size).toBe(accounts.size);
    }
  });

  it('keeps the Turkish words the feed has always shown', () => {
    const catalog = CATALOGS[CONTENT_VERSION]!;
    expect(catalog.skip[0]?.caption.tr).toBe('POV: pazartesi sabahı');
    expect(catalog.skip[5]?.caption.tr).toBe('Bunu izleyenlerin %97’si kaydırdı');
    expect(catalog.freeze.map((post) => post.caption.tr)).toEqual(Array(5).fill('Kıpırdama. Dokunma.'));
    expect(catalog.freeze.map((post) => post.headline?.tr)).toEqual([
      'Annen odaya girdi',
      'Patron arkanda',
      'Hoca bakıyor',
      'Babanın ayak sesleri',
      'Ekran süresi uyarısı',
    ]);
  });

  it('writes each language the way it is typed', () => {
    for (const words of lines) {
      // French: a no-break space before ! ? : ; and % — never a plain one, never none.
      expect(words.fr, words.fr).not.toMatch(/[^ !?][!?:;%]/);
      // Spanish opens what it asks or exclaims.
      if (words.es.includes('?')) expect(words.es).toContain('¿');
      if (words.es.includes('!')) expect(words.es).toContain('¡');
      // Arabic: Latin digits, and its own comma and question mark.
      expect(words.ar, words.ar).not.toMatch(/[٠-٩۰-۹,?]/);
    }
  });
});

describe('fixtures', () => {
  it('content.json is current', () => {
    expect(read('content.json')).toEqual(JSON.parse(JSON.stringify(buildContent())));
  });

  it('pace.json is current', () => {
    expect(read('pace.json')).toEqual(JSON.parse(JSON.stringify(buildPace())));
  });

  it('never rewrites a published catalog: ids only grow at the end', () => {
    const published = (read('content.json') as ReturnType<typeof buildContent>).catalogs;
    for (const { version, ids } of published) {
      const catalog = CATALOGS[version]!;
      for (const [kind, list] of Object.entries(ids)) {
        expect(catalog[kind as keyof typeof catalog].slice(0, list.length).map((post) => post.id)).toEqual(list);
      }
    }
  });
});
