import {
  DIFFICULTIES,
  DIFFICULTY_VERSION,
  MAX_DIFFICULTY,
  drainAt,
  likeWeightAt,
  lossAt,
  specialShareAt,
} from './difficulty';
import { PROFILES, blindSwipe, playRun } from './bot';
import { Rng } from './rng';
import {
  BONUS_KINDS,
  REEL_KINDS,
  RULES,
  baseWindow,
  bonusFor,
  comboAfterHit,
  comboAfterMiss,
  drainFor,
  holdFillFor,
  levelBoostFor,
  levelFor,
  specialShareFor,
  windowFor,
  zoneWidthFor,
  type BonusKind,
  type ReelKind,
} from './rules';
import {
  EngineError,
  GESTURE,
  Run,
  replay,
  type Action,
  type BonusHit,
  type RunSummary,
  type Verdict,
} from './run';

/**
 * The fixture sets, built deterministically so a test can rebuild them and
 * fail when the committed files have gone stale. Not shipped in the app.
 */
export type ReplayFixture = {
  name: string;
  seed: number;
  actions: Action[];
  summary: RunSummary;
};

export type RejectFixture = {
  name: string;
  seed: number;
  actions: unknown[];
  error: EngineError['code'];
  reelIndex: number;
};

const SEEDS = [1, 42, 7919, 123456789, 2147483647, 4294967295];

export function buildReplays(): ReplayFixture[] {
  const fixtures: ReplayFixture[] = [];
  for (const profile of PROFILES) {
    for (const seed of SEEDS) {
      const run = new Run(seed);
      const actions = playRun(run, profile, seed + profile.name.length);
      fixtures.push({
        name: `${profile.name}-${seed}`,
        seed,
        actions,
        summary: run.summary(),
      });
    }
  }

  for (const profile of PROFILES) {
    const seed = 99991;
    const played = playRun(new Run(seed), profile, 5);
    const actions = played.slice(0, Math.floor(played.length / 2));
    fixtures.push({
      name: `${profile.name}-quit-halfway`,
      seed,
      actions,
      summary: replay(seed, actions),
    });
  }

  fixtures.push({
    name: 'quit-before-first-reel',
    seed: 5,
    actions: [],
    summary: replay(5, []),
  });

  return fixtures;
}

function untilOver(seed: number): Action[] {
  const run = new Run(seed);
  const actions: Action[] = [];
  while (!run.over) {
    const action: Action = [GESTURE.none, 0, 0];
    actions.push(action);
    run.apply(action);
  }
  return actions;
}

function rejectOf(name: string, seed: number, actions: unknown[]): RejectFixture {
  try {
    replay(seed, actions as Action[]);
  } catch (error) {
    if (error instanceof EngineError) {
      return { name, seed, actions, error: error.code, reelIndex: error.reelIndex };
    }
    throw error;
  }
  throw new Error(`fixture ${name} was accepted`);
}

export function buildRejects(): RejectFixture[] {
  const seed = 42;
  const firstSix: Action[] = [
    [GESTURE.up, 400, 0],
    [GESTURE.up, 400, 0],
    [GESTURE.like, 500, 0],
    [GESTURE.up, 400, 0],
    [GESTURE.none, 0, 0],
    [GESTURE.up, 400, 0],
  ];
  return [
    rejectOf('two-element-action', seed, [[1, 400]]),
    rejectOf('unknown-gesture', seed, [[7, 400, 0]]),
    rejectOf('negative-time', seed, [[1, -1, 0]]),
    rejectOf('fractional-time', seed, [[1, 400.5, 0]]),
    rejectOf('hold-duration-on-swipe', seed, [[1, 400, 30]]),
    rejectOf('time-on-none', seed, [[0, 5, 0]]),
    rejectOf('act-after-window', seed, [[1, 2200, 0]]),
    rejectOf('touch-on-skip-reel', seed, [[4, 300, 0]]),
    rejectOf('swipe-on-freeze-reel', seed, [...firstSix, [1, 300, 0]]),
    rejectOf('action-after-run-over', seed, [...untilOver(seed), [1, 300, 0]]),
    rejectOf('not-an-array', seed, [{ g: 1, t: 400, d: 0 }]),
  ];
}

const COMBOS = [1000, 1025, 1050, 1062, 1100, 1125, 1250, 1300, 1450, 1475, 1499, 1500];

export function buildCurves() {
  const reels = [0, 1, 2, 5, 10, 19, 20, 50, 70, 100, 150, 200, 300, 500, 1000, 2000, 5000];
  return {
    reels: reels.map((n) => ({
      n,
      baseWindow: baseWindow(n),
      windows: Object.fromEntries(REEL_KINDS.map((kind) => [kind, windowFor(kind, n)])),
      holdFill: holdFillFor(n),
      zoneWidth: zoneWidthFor(n),
      specialShare: specialShareFor(n),
      drain: drainFor(n),
      level: levelFor(n),
      levelBoost: levelBoostFor(n),
      bonuses: Object.fromEntries(BONUS_KINDS.map((kind) => [kind, bonusFor(kind, n)])),
    })),
    combo: COMBOS.map((combo) => ({
      combo,
      afterHit: comboAfterHit(combo),
      afterMiss: comboAfterMiss(combo),
    })),
    rng: [1, 42, 0, 4294967295].map((seed) => {
      const rng = new Rng(seed);
      return { seed, next: Array.from({ length: 8 }, () => rng.next()) };
    }),
  };
}

/** The rules as data, for a readable diff when the PHP twin drifts. */
export function buildRules() {
  return RULES;
}

export type StepFixture = {
  index: number;
  kind: ReelKind;
  verdict: Verdict;
  points: number;
  combo: number;
  bonuses: BonusHit[];
  blind: number;
  meter: number;
};

export type BonusFixture = {
  name: string;
  seed: number;
  actions: Action[];
  steps: StepFixture[];
  summary: RunSummary;
};

/** A thumb that never misses: swipes and likes after `decideMs`, holds dead centre. */
function cleanAction(run: Run, decideMs: number): Action {
  const reel = run.current;
  switch (reel.kind) {
    case 'skip':
      return [GESTURE.up, decideMs, 0];
    case 'like':
      return [GESTURE.like, decideMs, 0];
    case 'freeze':
      return [GESTURE.none, 0, 0];
    case 'hold':
      return [GESTURE.hold, 300, Math.round((reel.zoneCenter * reel.holdFill) / 1000)];
  }
}

function recorded(
  name: string,
  seed: number,
  play: (run: Run) => Action | null,
  difficulty = 0,
): BonusFixture {
  const run = new Run(seed, difficulty);
  const actions: Action[] = [];
  const steps: StepFixture[] = [];
  while (!run.over) {
    const action = play(run);
    if (action === null) break;
    const step = run.apply(action);
    actions.push(action);
    steps.push({
      index: step.reel.index,
      kind: step.reel.kind,
      verdict: step.verdict,
      points: step.points,
      combo: step.combo,
      bonuses: [...step.bonuses],
      blind: step.blind,
      meter: step.meter,
    });
  }
  run.quit();
  return { name, seed, actions, steps, summary: run.summary() };
}

/** Lets skip reels time out until the meter ends a reel below `comebackLow`, then plays clean. */
function comeback(): BonusFixture {
  let dipped = false;
  return recorded('comeback', 7, (run) => {
    const reels = run.summary().reels;
    if (reels >= 70) return null;
    if (run.meter < RULES.comebackLow) dipped = true;
    const reel = run.current;
    if (reels >= 10 && !dipped && reel.kind === 'skip') {
      const after =
        run.meter - Math.floor((reel.drain * reel.window) / 1000) - RULES.loss.timeout;
      if (after > 150) return [GESTURE.none, 0, 0];
    }
    return cleanAction(run, 450);
  });
}

/**
 * Plays clean until the intro is over, then makes a blind move — a quick
 * double tap on a skip reel — and fills the meter back with fast hits that
 * never forgive it, so the next blind move doubles again: x2, x4, then the
 * third, which always ends the run.
 */
function thirdBlindMove(): BonusFixture {
  const quick: Record<ReelKind, Action | null> = {
    skip: [GESTURE.up, 200, 0],
    like: [GESTURE.like, 250, 0],
    hold: null,
    freeze: null,
  };
  let blinds = 0;
  return recorded('third-blind-move', 3, (run) => {
    const reel = run.current;
    if (reel.index < RULES.intro.length) return cleanAction(run, 450);
    if (blinds === 0 || run.meter >= 850 || blinds === 2) {
      if (reel.kind !== 'skip') return quick[reel.kind] ?? cleanAction(run, 450);
      blinds += 1;
      return [GESTURE.like, 250, 0];
    }
    return quick[reel.kind] ?? cleanAction(run, 450);
  });
}

/**
 * Step-by-step logs for the named combos, the combo's halving and the blind
 * moves, so the PHP twin is checked on every reel's points and meter, not
 * only on the total. Between them, every named combo goes off at least once,
 * and a blind move is doubled up to the third.
 */
export function buildBonuses(): BonusFixture[] {
  const fixtures = [
    recorded('clean-and-fast', 42, (run) =>
      run.summary().reels < 80 ? cleanAction(run, 300) : null,
    ),
    recorded('clean-but-slow', 42, (run) =>
      run.summary().reels < 60
        ? cleanAction(run, Math.min(900, run.current.window - 1))
        : null,
    ),
    recorded('a-miss-halves-the-combo', 99, (run) => {
      const reels = run.summary().reels;
      if (reels >= 40) return null;
      if ((reels === 14 || reels === 15) && run.current.kind === 'skip') {
        return [GESTURE.none, 0, 0];
      }
      return cleanAction(run, 400);
    }),
    comeback(),
    recorded('blind-swiper', 42, (run) => blindSwipe(run, 200)),
    recorded('blind-then-looks-again', 99, (run) => {
      if (run.summary().reels >= 60) return null;
      return run.current.kind === 'like' ? [GESTURE.up, 200, 0] : cleanAction(run, 450);
    }),
    recorded('slow-wrong-is-not-blind', 7919, (run) => {
      if (run.summary().reels >= 40) return null;
      return run.current.kind === 'like' ? [GESTURE.up, 450, 0] : cleanAction(run, 450);
    }),
    thirdBlindMove(),
  ];

  const seen = new Set<BonusKind>();
  for (const fixture of fixtures) {
    for (const step of fixture.steps) for (const bonus of step.bonuses) seen.add(bonus.kind);
  }
  for (const kind of BONUS_KINDS) {
    if (!seen.has(kind)) throw new Error(`no bonus fixture sets off ${kind}`);
  }
  const blinds = new Set(fixtures.flatMap((fixture) => fixture.steps.map((step) => step.blind)));
  for (const blind of [0, 1, 2, 3]) {
    if (!blinds.has(blind)) throw new Error(`no step log makes blind move ${blind}`);
  }
  return fixtures;
}

export type DifficultyReplayFixture = ReplayFixture & { difficulty: number };
export type DifficultyStepFixture = BonusFixture & { difficulty: number };

/** The difficulties the fixtures play: the first step, the middle, the top. */
const PLAYED_DIFFICULTIES = [1, 8, MAX_DIFFICULTY];

/**
 * Dereceli's difficulties (`difficulty.ts`), for the PHP twin: the table,
 * what it does to the curves and the losses, bot runs replayed at each
 * difficulty, and step logs whose meter must match reel by reel. Difficulty
 * 0 needs none of its own — it is every other fixture.
 */
export function buildDifficulty() {
  const reels = [0, 7, 8, 20, 100, 300, 600, 2000];
  const replays: DifficultyReplayFixture[] = [];
  for (const difficulty of PLAYED_DIFFICULTIES) {
    for (const profile of PROFILES) {
      for (const seed of [42, 7919]) {
        const run = new Run(seed, difficulty);
        const actions = playRun(run, profile, seed + profile.name.length);
        replays.push({
          name: `${profile.name}-${seed}-d${difficulty}`,
          seed,
          difficulty,
          actions,
          summary: run.summary(),
        });
      }
    }
  }

  const steps: DifficultyStepFixture[] = PLAYED_DIFFICULTIES.flatMap((difficulty) => [
    {
      difficulty,
      ...recorded(
        `clean-but-slow-d${difficulty}`,
        42,
        (run) =>
          run.summary().reels < 60
            ? cleanAction(run, Math.min(900, run.current.window - 1))
            : null,
        difficulty,
      ),
    },
    {
      difficulty,
      ...recorded(
        `misses-and-a-blind-move-d${difficulty}`,
        99,
        (run) => {
          const reels = run.summary().reels;
          if (reels >= 50) return null;
          if (reels === 12 || reels === 30) return [GESTURE.none, 0, 0];
          if (run.current.kind === 'like' && reels > 20) return [GESTURE.up, 200, 0];
          return cleanAction(run, 450);
        },
        difficulty,
      ),
    },
    { difficulty, ...recorded(`blind-swiper-d${difficulty}`, 42, (run) => blindSwipe(run, 200), difficulty) },
  ]);

  return {
    version: DIFFICULTY_VERSION,
    table: DIFFICULTIES,
    curves: DIFFICULTIES.map((_, difficulty) => ({
      difficulty,
      likeWeight: likeWeightAt(difficulty),
      reels: reels.map((n) => ({
        n,
        specialShare: specialShareAt(n, difficulty),
        drain: drainAt(n, difficulty),
      })),
      losses: Object.fromEntries(
        Object.entries(RULES.loss).map(([kind, loss]) => [kind, lossAt(loss, difficulty)]),
      ),
    })),
    replays,
    steps,
  };
}
