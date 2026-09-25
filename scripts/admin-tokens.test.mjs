import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { contrastRatio, parseOklch } from './lib/oklch.mjs';

/*
| The admin panel's tokens (apps/admin/src/index.css) against two promises:
| its brand is the game's (apps/mobile/design/palette.mjs), and every text
| role can be read on the surface it sits on, in both themes.
*/

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'apps/admin/src/index.css'), 'utf8');
const { roles: game } = await import(pathToFileURL(join(root, 'apps/mobile/design/palette.mjs')).href);

/** The `--name: value;` declarations of the first block that opens with `selector {`. */
function block(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `no ${selector} block in index.css`);
  let depth = 0;
  let end = start;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) {
      end = i;
      break;
    }
  }
  const body = css.slice(start, end);
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim().replace(/\s+/g, ' ')]),
  );
}

const light = block(':root');
const dark = { ...light, ...block('.dark') };

/** A custom property's colour in a theme, following `var(--x)` down to the oklch() it names. */
function colour(theme, name) {
  let value = theme[name];
  for (let hops = 0; value?.startsWith('var('); hops++) {
    assert.ok(hops < 5, `${name} loops`);
    value = theme[value.slice(4, -1).trim()];
  }
  const parsed = parseOklch(value ?? '');
  assert.ok(parsed, `${name} is not an oklch() colour: ${value}`);
  return parsed;
}

describe('the admin brand', () => {
  it('is the game\'s own gradient, in both themes', () => {
    for (const theme of [light, dark]) {
      assert.equal(theme['--role-brand-from'], game.brandFrom);
      assert.equal(theme['--role-brand-to'], game.brandTo);
    }
  });
});

/** [text, surface, least ratio, what it is]. 4.5:1 is WCAG AA for body text, 3:1 for large text. */
const PAIRS = [
  ['--p-ink', '--p-9', 4.5, 'a primary button'],
  ['--role-ink', '--role-canvas', 4.5, 'text on the page'],
  ['--role-ink', '--role-raised', 4.5, 'text in a card'],
  ['--role-ink-muted', '--role-raised', 4.5, 'a description in a card'],
  ['--role-ink-muted', '--role-canvas', 4.5, 'a description on the page'],
  ['--role-ink-faint', '--role-raised', 3, 'a label or a table head in a card'],
  ['--role-ink', '--role-fill', 4.5, 'text in a field'],
  ['--role-ink-muted', '--role-fill', 4.5, 'a neutral button, a chip at rest'],
  ['--p-11', '--p-3', 4.5, 'a primary tag, the chosen nav item'],
  ['--s-11', '--s-3', 4.5, 'a secondary tag'],
  ['--ok-text', '--ok-soft', 4.5, 'an ok tag'],
  ['--warn-text', '--warn-soft', 4.5, 'a warning tag'],
  ['--bad-text', '--bad-soft', 4.5, 'a danger tag'],
  ['--role-on-brand', '--role-brand-from', 4.5, 'text on the brand band'],
];

for (const [name, theme] of [
  ['light', light],
  ['dark', dark],
]) {
  describe(`${name} theme contrast`, () => {
    for (const [text, surface, least, what] of PAIRS) {
      it(`${what}: ${text} on ${surface} ≥ ${least}:1`, () => {
        const ratio = contrastRatio(colour(theme, text), colour(theme, surface));
        assert.ok(ratio >= least, `${ratio.toFixed(2)}:1`);
      });
    }
  });
}

/** A field's well must stand out of every surface that holds a form — a card, a dialog. */
for (const [name, theme] of [
  ['light', light],
  ['dark', dark],
]) {
  describe(`${name} theme wells`, () => {
    for (const surface of ['--role-raised', '--role-overlay', '--role-canvas']) {
      it(`a field stands out of ${surface}`, () => {
        const ratio = contrastRatio(colour(theme, '--role-fill'), colour(theme, surface));
        assert.ok(ratio >= 1.05, `${ratio.toFixed(3)}:1 — the well vanishes into the surface`);
      });
    }
  });
}
