/**
 * The characters the game's Japanese and Korean faces must carry — shared by
 * `cjk-fonts.mjs`, which cuts the fonts down to them, and its test, which
 * fails when a line needs one the cut fonts lack.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Where the words a player can read on screen live: the app's catalogs, the feed's posts, the API's lines. */
export const TEXT_SOURCES = [
  'apps/mobile/src/i18n/messages',
  'packages/config/src',
  'apps/api/lang/ja',
  'apps/api/lang/ko',
];

/** Kept whatever the catalogs say: Latin, punctuation, arrows and shapes, the kana, full-width forms. */
const BLOCKS = [
  [0x20, 0x7e],
  [0xa0, 0xff],
  [0x2010, 0x205e],
  [0x2190, 0x21ff],
  [0x25a0, 0x25ff],
  [0x3000, 0x30ff],
  [0xff01, 0xff5e],
];

/** Kana, kanji, Hangul and full-width forms: what only a Japanese or Korean face draws. */
const CJK = /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/u;

export function isCjk(char) {
  return CJK.test(char);
}

function filesUnder(path) {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path)
    .filter((name) => name !== '__tests__' && name !== 'node_modules')
    .flatMap((name) => filesUnder(join(path, name)));
}

/** Every character the faces carry, as a sorted string: the fixed blocks and each Japanese or Korean character of the sources. */
export function neededText(root) {
  const chars = new Set();
  for (const [from, to] of BLOCKS) {
    for (let code = from; code <= to; code += 1) chars.add(String.fromCodePoint(code));
  }
  for (const source of TEXT_SOURCES) {
    for (const file of filesUnder(join(root, source)).filter((path) => /\.(ts|php)$/.test(path))) {
      for (const char of readFileSync(file, 'utf8')) if (isCjk(char)) chars.add(char);
    }
  }
  return [...chars].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join('');
}
