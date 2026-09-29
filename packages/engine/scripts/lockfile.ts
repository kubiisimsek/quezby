/**
 * `rules.lock.json` — the seal on the rules. Node-only (hashing), shared by
 * `pnpm engine:lock` and `lock.test.ts`; the Laravel suite checks the same
 * file from PHP (`tests/Unit/RulesLockTest.php`).
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DIFFICULTIES } from '../src/difficulty';
import { canonicalJson } from '../src/lock';
import { RULES } from '../src/rules';

export const ROOT = join(__dirname, '..');
export const LOCK_FILE = join(ROOT, 'rules.lock.json');
/** Dereceli's difficulty table, sealed apart from the rules: a change is a new difficulty version, not a new season. */
export const DIFFICULTY_LOCK_FILE = join(ROOT, 'difficulty.lock.json');

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

/** Every row of the difficulty table, hashed. */
export function difficultySha256(): string {
  return sha256(canonicalJson(DIFFICULTIES));
}

/** The difficulty fixtures both engines replay. */
export function difficultyBehaviourSha256(): string {
  return sha256(canonicalJson(fixture('difficulty.json')));
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

export type DifficultySeal = {
  difficultyVersion: number;
  engineVersion: number;
  tableSha256: string;
  behaviourSha256: string;
  lockedAt: string;
};

export type DifficultyLock = {
  difficultyVersion: number;
  engineVersion: number;
  tableSha256: string;
  behaviourSha256: string;
  history: DifficultySeal[];
};

export function readDifficultyLock(): DifficultyLock {
  return JSON.parse(readFileSync(DIFFICULTY_LOCK_FILE, 'utf8')) as DifficultyLock;
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
  return sealing(
    previous && { version: previous.engineVersion, hashes: [previous.rulesSha256, previous.behaviourSha256] },
    engineVersion,
    [current.rulesSha256, current.behaviourSha256],
  );
}

export type DifficultyHashes = { tableSha256: string; behaviourSha256: string };

/**
 * The same rule for the difficulty table under `DIFFICULTY_VERSION`. A new
 * engine replays the difficulty fixtures differently, so it needs a new
 * difficulty version too.
 */
export function decideDifficulty(
  previous: DifficultyLock | null,
  difficultyVersion: number,
  current: DifficultyHashes,
): Decision {
  return sealing(
    previous && { version: previous.difficultyVersion, hashes: [previous.tableSha256, previous.behaviourSha256] },
    difficultyVersion,
    [current.tableSha256, current.behaviourSha256],
  );
}

function sealing(
  previous: { version: number; hashes: string[] } | null,
  version: number,
  current: string[],
): Decision {
  if (!previous) return { kind: 'seal' };
  if (version < previous.version) return { kind: 'refuse', reason: 'older-version' };
  if (version > previous.version) return { kind: 'seal' };
  const same = previous.hashes.every((hash, i) => hash === current[i]);
  return same ? { kind: 'current' } : { kind: 'refuse', reason: 'changed-without-bump' };
}
