import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * The store listing in apps/mobile/store must fit what App Store Connect and
 * Play Console accept, and keep clear of what they reject
 * (apps/mobile/store/README.md).
 */
const STORE = join(dirname(fileURLToPath(import.meta.url)), '../apps/mobile/store');

const read = (path) => readFileSync(join(STORE, path), 'utf8').trim();
/** Consoles differ on an emoji (one character or two): count the larger. */
const chars = (text) => Math.max([...text].length, text.length);
const bytes = (text) => Buffer.byteLength(text, 'utf8');
const words = (text, locale) =>
  text
    .toLocaleLowerCase(locale)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

const EMOJI = /\p{Extended_Pictographic}/u;
/** Other companies' names, prices and rank claims — refused in names and keywords. */
const REFUSED = ['instagram', 'tiktok', 'reels', 'youtube', 'shorts', 'ücretsiz', 'bedava', 'free', 'best', 'top'];
const RANK_CLAIMS = /#1|1 numara|en iyi oyun|best game/i;

const APP_STORE_LOCALES = readdirSync(join(STORE, 'app-store'));

describe('the App Store listing', () => {
  it('has the Turkish listing, and English (U.K.) beside it', () => {
    assert.deepEqual([...APP_STORE_LOCALES].sort(), ['en-GB', 'tr']);
  });

  for (const locale of APP_STORE_LOCALES) {
    const lang = locale === 'tr' ? 'tr' : 'en';
    const file = (name) => read(`app-store/${locale}/${name}.txt`);

    describe(locale, () => {
      it('fits App Store Connect', () => {
        assert.ok(chars(file('name')) <= 30, 'name: 30 characters');
        assert.ok(chars(file('subtitle')) <= 30, 'subtitle: 30 characters');
        assert.ok(bytes(file('keywords')) <= 100, 'keywords: 100 bytes of UTF-8');
        assert.ok(chars(file('promotional_text')) <= 170, 'promotional text: 170 characters');
        assert.ok(chars(file('description')) <= 4000, 'description: 4000 characters');
        assert.ok(chars(file('release_notes')) <= 4000, 'what’s new: 4000 characters');
      });

      it('names Quezby, without emoji', () => {
        assert.match(file('name'), /^Quezby: /);
        for (const name of ['name', 'subtitle']) assert.doesNotMatch(file(name), EMOJI);
      });


      it('spends every keyword byte on a new word', () => {
        const keywords = file('keywords').split(',');
        const seen = new Set([...words(file('name'), lang), ...words(file('subtitle'), lang)]);

        for (const keyword of keywords) {
          assert.match(keyword, /^\S+$/u, `"${keyword}": no spaces, no empty entries`);
          assert.equal(keyword, keyword.toLocaleLowerCase(lang));
          assert.ok(!seen.has(keyword), `"${keyword}" is already in the name or subtitle, or listed twice`);
          seen.add(keyword);
        }
      });

      it('claims no rank, price or other company’s name', () => {
        const indexed = [file('name'), file('subtitle'), file('keywords')].join(' ');
        for (const word of words(indexed, lang)) assert.ok(!REFUSED.includes(word), word);
        assert.doesNotMatch(file('description'), RANK_CLAIMS);
      });
    });
  }
});

describe('the Google Play listing', () => {
  const file = (name) => read(`google-play/tr-TR/${name}.txt`);

  it('fits Play Console', () => {
    assert.ok(chars(file('title')) <= 30, 'title: 30 characters');
    assert.ok(chars(file('short_description')) <= 80, 'short description: 80 characters');
    assert.ok(chars(file('full_description')) <= 4000, 'full description: 4000 characters');
    const changelogs = join(STORE, 'google-play/tr-TR/changelogs');
    for (const name of readdirSync(changelogs)) {
      assert.match(name, /^\d+\.txt$/, 'one file per versionCode');
      assert.ok(chars(read(`google-play/tr-TR/changelogs/${name}`)) <= 500, `${name}: 500 characters`);
    }
  });

  it('keeps the title plain, as Play’s metadata policy asks — emoji belong in the descriptions', () => {
    assert.match(file('title'), /^Quezby: /);
    assert.doesNotMatch(file('title'), EMOJI);
    for (const name of ['title', 'short_description']) {
      for (const word of words(file(name), 'tr')) assert.ok(!REFUSED.includes(word), word);
    }
    assert.doesNotMatch(file('full_description'), RANK_CLAIMS);
  });
});

describe('every listing', () => {
  it('writes the brand as Quezby, never in capitals', () => {
    const files = [];
    const walk = (dir) => {
      for (const entry of readdirSync(join(STORE, dir), { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.name.endsWith('.txt')) files.push(path);
      }
    };
    walk('.');

    assert.ok(files.length >= 14 && existsSync(join(STORE, 'README.md')));
    for (const path of files) assert.doesNotMatch(read(path), /QUEZBY/, path);
  });

  it('uses no emoji, the owner’s call (README → Ses tonu)', () => {
    const texts = [];
    const walk = (dir) => {
      for (const entry of readdirSync(join(STORE, dir), { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.name.endsWith('.txt')) texts.push(path);
      }
    };
    walk('.');

    for (const path of texts) assert.doesNotMatch(read(path), EMOJI, path);
  });

  it('calls what comes down the feed a post, never a reel', () => {
    const texts = [];
    const walk = (dir) => {
      for (const entry of readdirSync(join(STORE, dir), { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.name.endsWith('.txt')) texts.push(path);
      }
    };
    walk('.');

    for (const path of texts) assert.doesNotMatch(read(path), /\breel/i, path);
  });
});
