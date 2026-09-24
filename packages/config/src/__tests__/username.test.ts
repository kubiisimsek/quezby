import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  USERNAME_MESSAGES,
  normalizeUsername,
  usernameChecklist,
  validateUsername,
} from '../index';

type Fixtures = {
  valid: Array<{ input: string; normalized: string }>;
  invalid: Array<{ input: string; problem: string }>;
};

/** Shared with `apps/api/tests/Unit/UsernameTest.php`. */
const fixtures = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'fixtures', 'usernames.json'), 'utf8'),
) as Fixtures;

describe('validateUsername', () => {
  it.each(fixtures.valid)('accepts "$input"', ({ input, normalized }) => {
    expect(validateUsername(input)).toEqual({ ok: true, normalized });
  });

  it.each(fixtures.invalid)('rejects "$input" as $problem', ({ input, problem }) => {
    expect(validateUsername(input)).toEqual({ ok: false, problem });
  });

  it('never lets two symbols touch, in any order', () => {
    for (const pair of ['..', '**', '.*', '*.']) {
      expect(validateUsername(`ab${pair}cd`)).toEqual({
        ok: false,
        problem: 'consecutive_symbols',
      });
    }
  });

  it('has a message for every problem', () => {
    for (const { problem } of fixtures.invalid) {
      expect(USERNAME_MESSAGES[problem as keyof typeof USERNAME_MESSAGES]).toBeTruthy();
    }
  });

  it('normalizes to lower case so uniqueness ignores case', () => {
    expect(normalizeUsername('  KuBi.01 ')).toBe('kubi.01');
  });
});

describe('usernameChecklist', () => {
  it('meets every rule for a valid name', () => {
    expect(usernameChecklist('kubi.01').every((item) => item.met)).toBe(true);
  });

  it('shows which rule a name breaks', () => {
    const unmet = usernameChecklist('ku..').filter((item) => !item.met).map((item) => item.rule);
    expect(unmet).toEqual([
      'Harf ya da rakamla başlar ve biter',
      'Nokta ve yıldız art arda gelmez',
    ]);
  });
});
