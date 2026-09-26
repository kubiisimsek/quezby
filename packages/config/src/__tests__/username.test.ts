import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  USERNAME_PROBLEMS,
  canPickUsername,
  isAutoUsername,
  normalizeUsername,
  usernameChecklist,
  validateUsername,
} from '../index';

type Fixtures = {
  valid: Array<{ input: string; normalized: string }>;
  invalid: Array<{ input: string; problem: string }>;
  automatic: Array<{ name: string; automatic: boolean }>;
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

  it('names every problem the fixtures refuse a name for', () => {
    for (const { problem } of fixtures.invalid) {
      expect(USERNAME_PROBLEMS).toContain(problem);
    }
  });

  it('normalizes to lower case so uniqueness ignores case', () => {
    expect(normalizeUsername('  KuBi.01 ')).toBe('kubi.01');
  });

  it('keeps every guest-and-digits name for the API, however it is dotted', () => {
    for (const name of ['guest1', 'gu.est.123', 'misafir*2026', 'Guest48128742']) {
      expect(validateUsername(name)).toEqual({ ok: false, problem: 'reserved' });
    }
  });
});

describe('isAutoUsername', () => {
  it.each(fixtures.automatic)('says "$name" is automatic: $automatic', ({ name, automatic }) => {
    expect(isAutoUsername(name)).toBe(automatic);
  });

  it('is false when there is no name at all', () => {
    expect(isAutoUsername(null)).toBe(false);
    expect(isAutoUsername(undefined)).toBe(false);
  });

  it('only ever matches a name the rules keep from players', () => {
    for (const { name, automatic } of fixtures.automatic) {
      if (automatic) expect(validateUsername(name)).toEqual({ ok: false, problem: 'reserved' });
    }
  });
});

describe('canPickUsername', () => {
  it.each(fixtures.automatic)('lets a player pick over "$name": $automatic', ({ name, automatic }) => {
    expect(canPickUsername(name)).toBe(automatic);
  });

  it('lets an account with no name pick one', () => {
    expect(canPickUsername(null)).toBe(true);
    expect(canPickUsername(undefined)).toBe(true);
  });

  it('keeps every name a player could have picked', () => {
    for (const { normalized } of fixtures.valid) expect(canPickUsername(normalized)).toBe(false);
  });
});

describe('usernameChecklist', () => {
  it('meets every rule for a valid name', () => {
    expect(usernameChecklist('kubi.01').every((item) => item.met)).toBe(true);
  });

  it('shows which rule a name breaks', () => {
    const unmet = usernameChecklist('ku..').filter((item) => !item.met).map((item) => item.rule);
    expect(unmet).toEqual(['edges', 'symbols']);
  });

  it('lists the rules in the order the field shows them', () => {
    expect(usernameChecklist('').map((item) => item.rule)).toEqual([
      'length',
      'charset',
      'edges',
      'symbols',
      'letter',
    ]);
  });
});
