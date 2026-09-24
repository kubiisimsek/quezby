/**
 * `rules.lock.json` — the seal on the rules. Node-only (hashing), shared by
 * `pnpm engine:lock` and `lock.test.ts`; the Laravel suite checks the same
 * file from PHP (`tests/Unit/RulesLockTest.php`).
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { canonicalJson } from '../src/lock';
import { RULES } from '../src/rules';

export const ROOT = join(__dirname, '..');
export const LOCK_FILE = join(ROOT, 'rules.lock.json');

/** Replays whose score the lock records, so a version bump reads in the diff. */
export const GOLDEN_RUNS = ['casual-42', 'average-42', 'good-42', 'pro-7919'] as const;

export type Seal = {
  engineVersion: number;
  rulesSha256: string;
  behaviourSha256: string;
  lockedAt: string;
};

export type Lock = {
  engineVersion: number;
  rulesSha256: string;
  behaviourSha256: string;
  goldens: Record<string, number>;
  history: Seal[];
};

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(join(ROOT, 'fixtures', name), 'utf8'));
}

/** Every number and word of `RULES`, hashed. */
export function rulesSha256(): string {
  return sha256(canonicalJson(RULES));
}

/** The committed fixtures both engines replay — catches a logic change that leaves `RULES` alone. */
export function behaviourSha256(): string {
  return sha256(
    canonicalJson({
      bonuses: fixture('bonuses.json'),
      curves: fixture('curves.json'),
      rejects: fixture('rejects.json'),
      replays: fixture('replays.json'),
    }),
  );
}

export function goldenScores(): Record<string, number> {
  const replays = fixture('replays.json') as Array<{ name: string; summary: { score: number } }>;
  return Object.fromEntries(
    GOLDEN_RUNS.map((name) => {
      const run = replays.find((replay) => replay.name === name);
      if (!run) throw new Error(`no replay fixture named ${name}`);
      return [name, run.summary.score];
    }),
  );
}

export function readLock(): Lock {
  return JSON.parse(readFileSync(LOCK_FILE, 'utf8')) as Lock;
}

export type Hashes = { rulesSha256: string; behaviourSha256: string };

export type Decision =
  | { kind: 'current' }
  | { kind: 'seal' }
  | { kind: 'refuse'; reason: 'older-version' | 'changed-without-bump' };

/**
 * Whether `pnpm engine:lock` may seal: never over a newer lock, never a
 * changed game under the same version — only a bumped version is re-sealed.
 */
export function decide(previous: Lock | null, engineVersion: number, current: Hashes): Decision {
  if (!previous) return { kind: 'seal' };
  if (engineVersion < previous.engineVersion) return { kind: 'refuse', reason: 'older-version' };
  if (engineVersion > previous.engineVersion) return { kind: 'seal' };
  const same =
    previous.rulesSha256 === current.rulesSha256 &&
    previous.behaviourSha256 === current.behaviourSha256;
  return same ? { kind: 'current' } : { kind: 'refuse', reason: 'changed-without-bump' };
}
