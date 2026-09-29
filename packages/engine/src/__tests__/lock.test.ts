import { describe, expect, it } from 'vitest';

import {
  behaviourSha256,
  decide,
  decideDifficulty,
  difficultyBehaviourSha256,
  difficultySha256,
  goldenScores,
  readDifficultyLock,
  readLock,
  rulesSha256,
  type DifficultyLock,
  type Lock,
} from '../../scripts/lockfile';
import { DIFFICULTY_VERSION } from '../difficulty';
import { canonicalJson } from '../lock';
import { ENGINE_VERSION } from '../rules';

const BUMP =
  'The scoring system is locked. A change is a new season: bump ENGINE_VERSION, ' +
  'run pnpm engine:simulate, pnpm engine:fixtures and pnpm engine:lock.';

describe('rules lock', () => {
  const lock = readLock();

  it('names the engine version that is running', () => {
    expect(lock.engineVersion, BUMP).toBe(ENGINE_VERSION);
  });

  it('matches every rule', () => {
    expect(rulesSha256(), BUMP).toBe(lock.rulesSha256);
  });

  it('matches the fixtures both engines replay', () => {
    expect(behaviourSha256(), BUMP).toBe(lock.behaviourSha256);
  });

  it('keeps the golden scores', () => {
    expect(goldenScores()).toEqual(lock.goldens);
  });

  it('only ever moves forward, and its last seal is the current one', () => {
    const versions = lock.history.map((seal) => seal.engineVersion);
    for (let i = 1; i < versions.length; i += 1) {
      expect(versions[i]!).toBeGreaterThan(versions[i - 1]!);
    }
    expect(lock.history.at(-1)).toMatchObject({
      engineVersion: lock.engineVersion,
      rulesSha256: lock.rulesSha256,
      behaviourSha256: lock.behaviourSha256,
    });
  });
});

describe('pnpm engine:lock', () => {
  const sealed: Lock = {
    engineVersion: 2,
    rulesSha256: 'rules',
    behaviourSha256: 'behaviour',
    goldens: {},
    history: [],
  };
  const same = { rulesSha256: 'rules', behaviourSha256: 'behaviour' };

  it('seals the first lock', () => {
    expect(decide(null, 1, same)).toEqual({ kind: 'seal' });
  });

  it('says current when nothing changed', () => {
    expect(decide(sealed, 2, same)).toEqual({ kind: 'current' });
  });

  it('refuses changed rules or fixtures under the same version', () => {
    expect(decide(sealed, 2, { ...same, rulesSha256: 'edited' })).toEqual({
      kind: 'refuse',
      reason: 'changed-without-bump',
    });
    expect(decide(sealed, 2, { ...same, behaviourSha256: 'edited' })).toEqual({
      kind: 'refuse',
      reason: 'changed-without-bump',
    });
  });

  it('refuses to go back to an older version', () => {
    expect(decide(sealed, 1, same)).toEqual({ kind: 'refuse', reason: 'older-version' });
  });

  it('re-seals only after the version went up', () => {
    expect(decide(sealed, 3, { rulesSha256: 'new', behaviourSha256: 'new' })).toEqual({
      kind: 'seal',
    });
  });
});

const DIFFICULTY_BUMP =
  'The difficulty table is sealed. A change is a new difficulty version: bump DIFFICULTY_VERSION, ' +
  'run pnpm engine:simulate, pnpm engine:fixtures and pnpm engine:lock, and add its Elo targets.';

describe('difficulty lock', () => {
  const lock = readDifficultyLock();

  it('names the difficulty version and the engine it was sealed on', () => {
    expect(lock.difficultyVersion, DIFFICULTY_BUMP).toBe(DIFFICULTY_VERSION);
    expect(lock.engineVersion, DIFFICULTY_BUMP).toBe(ENGINE_VERSION);
  });

  it('matches every row and the fixtures both engines replay', () => {
    expect(difficultySha256(), DIFFICULTY_BUMP).toBe(lock.tableSha256);
    expect(difficultyBehaviourSha256(), DIFFICULTY_BUMP).toBe(lock.behaviourSha256);
  });

  it('only ever moves forward, and its last seal is the current one', () => {
    const versions = lock.history.map((seal) => seal.difficultyVersion);
    for (let i = 1; i < versions.length; i += 1) {
      expect(versions[i]!).toBeGreaterThan(versions[i - 1]!);
    }
    expect(lock.history.at(-1)).toMatchObject({
      difficultyVersion: lock.difficultyVersion,
      tableSha256: lock.tableSha256,
      behaviourSha256: lock.behaviourSha256,
    });
  });

  it('leaves the rules lock alone: difficulty 0 is engine v3', () => {
    expect(rulesSha256()).toBe(readLock().rulesSha256);
    expect(behaviourSha256()).toBe(readLock().behaviourSha256);
  });
});

describe('pnpm engine:lock, for the difficulty table', () => {
  const sealed: DifficultyLock = {
    difficultyVersion: 1,
    engineVersion: 3,
    tableSha256: 'table',
    behaviourSha256: 'behaviour',
    history: [],
  };
  const same = { tableSha256: 'table', behaviourSha256: 'behaviour' };

  it('seals the first lock and says current when nothing changed', () => {
    expect(decideDifficulty(null, 1, same)).toEqual({ kind: 'seal' });
    expect(decideDifficulty(sealed, 1, same)).toEqual({ kind: 'current' });
  });

  it('refuses a changed table or changed replays under the same version', () => {
    expect(decideDifficulty(sealed, 1, { ...same, tableSha256: 'edited' })).toEqual({
      kind: 'refuse',
      reason: 'changed-without-bump',
    });
    expect(decideDifficulty(sealed, 1, { ...same, behaviourSha256: 'edited' })).toEqual({
      kind: 'refuse',
      reason: 'changed-without-bump',
    });
  });

  it('re-seals after the version went up, never back', () => {
    expect(decideDifficulty(sealed, 2, { tableSha256: 'new', behaviourSha256: 'new' })).toEqual({ kind: 'seal' });
    expect(decideDifficulty(sealed, 0, same)).toEqual({ kind: 'refuse', reason: 'older-version' });
  });
});

describe('canonicalJson', () => {
  it('sorts keys at every depth and keeps array order', () => {
    expect(canonicalJson({ b: 1, a: [3, { d: 'x', c: true }] })).toBe(
      '{"a":[3,{"c":true,"d":"x"}],"b":1}',
    );
  });

  it('refuses what PHP could not write back the same way', () => {
    expect(() => canonicalJson({})).toThrow(/empty objects/);
    expect(() => canonicalJson(Number.NaN)).toThrow(/not finite/);
    expect(() => canonicalJson(() => 1)).toThrow(/cannot encode/);
  });
});
