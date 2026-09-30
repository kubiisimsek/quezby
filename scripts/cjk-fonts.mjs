#!/usr/bin/env node
/**
 * The game's Japanese and Korean faces, cut down to the characters it draws.
 *
 *   pnpm fonts:cjk
 *
 * Run it after adding or changing a Japanese or Korean line. The full fonts —
 * several MB each, tens of thousands of glyphs — come from Google Fonts at a
 * pinned commit into node_modules/.cache; each is cut to the characters of the
 * catalogs (`lib/cjk-text.mjs`) and written where iOS and Android load fonts
 * from, with `cjk-fonts.json` saying which characters were asked for.
 * `cjk-fonts.test.mjs` fails when a line needs a character they lack.
 *
 * Japanese is set in M PLUS Rounded 1c; Korean in Jua for display and Gothic
 * A1 for reading (all OFL, licences next to the fonts). A file is named by the
 * font's PostScript name: iOS finds a font by it, Android by the file's name.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import subsetFont from 'subset-font';

import { neededText } from './lib/cjk-text.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** google/fonts at the commit the faces were cut from. */
export const COMMIT = '9710da1eacb3be272583c3224dcb70f9da6eadbb';

export const FONTS = [
  { file: 'RoundedMplus1c-Medium.ttf', source: 'ofl/mplusrounded1c/MPLUSRounded1c-Medium.ttf', script: 'japanese' },
  { file: 'RoundedMplus1c-Bold.ttf', source: 'ofl/mplusrounded1c/MPLUSRounded1c-Bold.ttf', script: 'japanese' },
  { file: 'RoundedMplus1c-ExtraBold.ttf', source: 'ofl/mplusrounded1c/MPLUSRounded1c-ExtraBold.ttf', script: 'japanese' },
  { file: 'RoundedMplus1c-Black.ttf', source: 'ofl/mplusrounded1c/MPLUSRounded1c-Black.ttf', script: 'japanese' },
  { file: 'Jua-Regular.ttf', source: 'ofl/jua/Jua-Regular.ttf', script: 'korean' },
  { file: 'GothicA1-SemiBold.ttf', source: 'ofl/gothica1/GothicA1-SemiBold.ttf', script: 'korean' },
  { file: 'GothicA1-Bold.ttf', source: 'ofl/gothica1/GothicA1-Bold.ttf', script: 'korean' },
  { file: 'GothicA1-ExtraBold.ttf', source: 'ofl/gothica1/GothicA1-ExtraBold.ttf', script: 'korean' },
  { file: 'GothicA1-Black.ttf', source: 'ofl/gothica1/GothicA1-Black.ttf', script: 'korean' },
];

/** What a face of each script leaves out: a Japanese one never draws Hangul, a Korean one never kana or kanji. */
const NOT_OF = {
  japanese: /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/u,
  korean: /[\u3040-\u30FF\u3400-\u9FFF\uF900-\uFAFF]/u,
};

/** The characters of `text` a face of `script` carries. */
export function textFor(script, text) {
  return Array.from(text).filter((char) => !NOT_OF[script].test(char)).join('');
}

/** Where the app bundles its fonts: iOS reads the first (Info.plist › UIAppFonts), Android the second. */
export const FONT_DIRS = ['apps/mobile/assets/fonts', 'apps/mobile/android/app/src/main/assets/fonts'];

export const MANIFEST = 'apps/mobile/assets/fonts/cjk-fonts.json';

const CACHE = join(root, 'node_modules/.cache/quezby-cjk-fonts', COMMIT);

async function fullFont(source) {
  const path = join(CACHE, source.replaceAll('/', '_'));
  if (existsSync(path)) return readFileSync(path);
  const url = `https://raw.githubusercontent.com/google/fonts/${COMMIT}/${source}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(path, bytes);
  return bytes;
}

async function main() {
  const text = neededText(root);
  for (const font of FONTS) {
    const cut = await subsetFont(await fullFont(font.source), textFor(font.script, text), {
      targetFormat: 'truetype',
      // A phone's renderer needs no hints; vertical text and alternate forms never show.
      noHinting: true,
      keepFeatures: ['ccmp', 'locl', 'kern', 'liga', 'calt'],
      dropTables: ['vhea', 'vmtx', 'VORG'],
    });
    for (const dir of FONT_DIRS) writeFileSync(join(root, dir, font.file), cut);
    console.log(`${font.file}: ${(cut.length / 1024).toFixed(0)} KB`);
  }
  writeFileSync(
    join(root, MANIFEST),
    `${JSON.stringify({ commit: COMMIT, fonts: FONTS.map((font) => font.file), text }, null, 2)}\n`,
  );
  console.log(`${MANIFEST}: ${Array.from(text).length} characters`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
