import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildSocial } from '../fixtures';
import { AVATAR, PHRASES, isPhrase } from '../social';

describe('phrases', () => {
  it('are a closed list of codes, each once', () => {
    expect(PHRASES.length).toBeGreaterThanOrEqual(8);
    expect(new Set(PHRASES).size).toBe(PHRASES.length);
    for (const code of PHRASES) expect(code).toMatch(/^[a-z_]+$/);
  });

  it('tells a code of the list from anything else', () => {
    expect(isPhrase('gg')).toBe(true);
    expect(isPhrase('rematch')).toBe(true);
    expect(isPhrase('hello there')).toBe(false);
    expect(isPhrase('constructor')).toBe(false);
  });
});

describe('a profile photo', () => {
  it('is a square of 512 kept under 100 KB, squeezed best quality first', () => {
    expect(AVATAR.size).toBe(512);
    expect(AVATAR.maxBytes).toBe(102_400);
    expect([...AVATAR.qualities].sort((a, b) => b - a)).toEqual([...AVATAR.qualities]);
    expect(AVATAR.minSide).toBeLessThan(AVATAR.size);
  });
});

describe('the fixture the API is tested against', () => {
  it('is the catalog as it stands', () => {
    const committed: unknown = JSON.parse(
      readFileSync(join(__dirname, '..', '..', 'fixtures', 'social.json'), 'utf8'),
    );
    expect(committed).toEqual(JSON.parse(JSON.stringify(buildSocial())));
  });
});
