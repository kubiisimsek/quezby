/**
 * Seals the rules: `pnpm engine:lock`.
 *
 * `rules.lock.json` records the engine version, the hash of every rule and
 * the hash of the fixtures both engines are tested against. The TypeScript and
 * Laravel suites fail the moment either drifts from it. This script re-seals
 * only when `ENGINE_VERSION` went up: a rules change is a new leaderboard
 * season, never a quiet edit.
 *
 * `difficulty.lock.json` seals Dereceli's difficulty table the same way under
 * `DIFFICULTY_VERSION`: a change there is a new difficulty version and a new
 * Elo target table, not a new season.
 */
import { existsSync, writeFileSync } from 'node:fs';

import { DIFFICULTY_VERSION } from '../src/difficulty';
import { ENGINE_VERSION } from '../src/rules';
import {
  DIFFICULTY_LOCK_FILE,
  LOCK_FILE,
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

const lockedAt = new Date().toISOString().slice(0, 10);

const decision = decide(previous, ENGINE_VERSION, current);
if (decision.kind === 'current') {
  console.log(`rules.lock.json is current (engine v${ENGINE_VERSION}).`);
} else if (decision.kind === 'refuse' && decision.reason === 'older-version') {
  fail(`ENGINE_VERSION ${ENGINE_VERSION} is older than the locked v${previous?.engineVersion}.`);
} else if (decision.kind === 'refuse') {
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
} else {
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
}

const difficulty = {
  tableSha256: difficultySha256(),
  behaviourSha256: difficultyBehaviourSha256(),
};
const sealedDifficulty: DifficultyLock | null = existsSync(DIFFICULTY_LOCK_FILE) ? readDifficultyLock() : null;
const difficultyDecision = decideDifficulty(sealedDifficulty, DIFFICULTY_VERSION, difficulty);
if (difficultyDecision.kind === 'current') {
  console.log(`difficulty.lock.json is current (difficulty v${DIFFICULTY_VERSION}).`);
} else if (difficultyDecision.kind === 'refuse' && difficultyDecision.reason === 'older-version') {
  fail(`DIFFICULTY_VERSION ${DIFFICULTY_VERSION} is older than the locked v${sealedDifficulty?.difficultyVersion}.`);
} else if (difficultyDecision.kind === 'refuse') {
  fail(
    [
      `The difficulty table or its fixtures changed, but DIFFICULTY_VERSION is still ${DIFFICULTY_VERSION}.`,
      '  1. bump DIFFICULTY_VERSION in packages/engine/src/difficulty.ts (and Difficulty::VERSION in PHP)',
      '  2. pnpm engine:simulate — the difficulty report must still hold',
      '  3. pnpm engine:fixtures',
      '  4. pnpm engine:lock',
      '  5. add the Elo targets: config/quezby.php › rating.difficulty.targets[ENGINE_VERSION][DIFFICULTY_VERSION]',
    ].join('\n'),
  );
} else {
  const lock: DifficultyLock = {
    difficultyVersion: DIFFICULTY_VERSION,
    engineVersion: ENGINE_VERSION,
    ...difficulty,
    history: [
      ...(sealedDifficulty?.history ?? []),
      { difficultyVersion: DIFFICULTY_VERSION, engineVersion: ENGINE_VERSION, ...difficulty, lockedAt },
    ],
  };
  writeFileSync(DIFFICULTY_LOCK_FILE, `${JSON.stringify(lock, null, 2)}\n`);
  console.log(`Locked difficulty v${DIFFICULTY_VERSION}: table ${difficulty.tableSha256.slice(0, 12)}…`);
}
