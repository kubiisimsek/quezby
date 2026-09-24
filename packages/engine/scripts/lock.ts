/**
 * Seals the rules: `pnpm engine:lock`.
 *
 * `rules.lock.json` records the engine version, the hash of every rule and
 * the hash of the fixtures both engines are tested against. The TypeScript and
 * Laravel suites fail the moment either drifts from it. This script re-seals
 * only when `ENGINE_VERSION` went up: a rules change is a new leaderboard
 * season, never a quiet edit.
 */
import { existsSync, writeFileSync } from 'node:fs';

import { ENGINE_VERSION } from '../src/rules';
import {
  LOCK_FILE,
  behaviourSha256,
  decide,
  goldenScores,
  readLock,
  rulesSha256,
  type Lock,
} from './lockfile';

const current = {
  rulesSha256: rulesSha256(),
  behaviourSha256: behaviourSha256(),
};
const previous: Lock | null = existsSync(LOCK_FILE) ? readLock() : null;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const decision = decide(previous, ENGINE_VERSION, current);
if (decision.kind === 'current') {
  console.log(`rules.lock.json is current (engine v${ENGINE_VERSION}).`);
  process.exit(0);
}
if (decision.kind === 'refuse' && decision.reason === 'older-version') {
  fail(`ENGINE_VERSION ${ENGINE_VERSION} is older than the locked v${previous?.engineVersion}.`);
}
if (decision.kind === 'refuse') {
  fail(
    [
      `The rules or the fixtures changed, but ENGINE_VERSION is still ${ENGINE_VERSION}.`,
      'The scoring system is locked: a change starts a new leaderboard season.',
      '  1. bump ENGINE_VERSION in packages/engine/src/rules.ts (and Rules::ENGINE_VERSION in PHP)',
      '  2. pnpm engine:simulate — the balance must still hold',
      '  3. pnpm engine:fixtures',
      '  4. pnpm engine:lock',
    ].join('\n'),
  );
}

const lockedAt = new Date().toISOString().slice(0, 10);
const lock: Lock = {
  engineVersion: ENGINE_VERSION,
  ...current,
  goldens: goldenScores(),
  history: [
    ...(previous?.history ?? []),
    { engineVersion: ENGINE_VERSION, ...current, lockedAt },
  ],
};
writeFileSync(LOCK_FILE, `${JSON.stringify(lock, null, 2)}\n`);
console.log(`Locked engine v${ENGINE_VERSION}: rules ${current.rulesSha256.slice(0, 12)}…`);
