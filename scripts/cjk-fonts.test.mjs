import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { FONTS, FONT_DIRS, MANIFEST, textFor } from './cjk-fonts.mjs';
import { isCjk, neededText } from './lib/cjk-text.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('the Japanese and Korean faces', () => {
  const manifest = JSON.parse(readFileSync(join(root, MANIFEST), 'utf8'));

  it('carry every Japanese and Korean character the game says', () => {
    const cut = new Set(manifest.text);
    const missing = Array.from(neededText(root)).filter((char) => isCjk(char) && !cut.has(char));
    assert.deepEqual(missing, [], `run pnpm fonts:cjk — the faces lack ${missing.join('')}`);
  });

  it('are the same files for iOS and Android', () => {
    assert.deepEqual(manifest.fonts, FONTS.map((font) => font.file));
    for (const font of FONTS) {
      const [ios, android] = FONT_DIRS.map((dir) => readFileSync(join(root, dir, font.file)));
      assert.ok(ios.equals(android), `${font.file} differs between ${FONT_DIRS.join(' and ')}`);
    }
  });

  it('leaves Hangul out of the Japanese faces and kana and kanji out of the Korean ones', () => {
    assert.equal(textFor('japanese', 'aあ字한！'), 'aあ字！');
    assert.equal(textFor('korean', 'aあ字한！'), 'a한！');
  });

  it('knows a Japanese or Korean character from the rest', () => {
    assert.ok(isCjk('あ') && isCjk('字') && isCjk('한') && isCjk('！'));
    assert.ok(!isCjk('a') && !isCjk('ğ') && !isCjk('ع') && !isCjk('…'));
  });
});
