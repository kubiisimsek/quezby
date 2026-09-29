import { Rng } from './rng';
import { GESTURE, type Action, type Run } from './run';

/**
 * Simulated players, for balancing (`pnpm engine:simulate`) and for the
 * replay fixtures the API is tested against. Not shipped in the app.
 *
 * A profile is a thumb: how fast it decides, how often it slips, how well it
 * resists the swipe reflex on a freeze reel, and how steady its hold is.
 */
export type SkillProfile = {
  name: string;
  /** Mean decision time, ms. */
  reaction: number;
  reactionSd: number;
  /** Chance of the wrong gesture on a calm reel. */
  slip: number;
  /** Chance of touching a freeze reel anyway. */
  reflex: number;
  /** Spread of a hold's release around the zone's centre, ms. */
  holdSd: number;
  /** Time between the two taps of a like, ms. */
  tapGap: number;
};

export const PROFILES: readonly SkillProfile[] = [
  {
    name: 'casual',
    reaction: 640,
    reactionSd: 150,
    slip: 0.06,
    reflex: 0.2,
    holdSd: 95,
    tapGap: 170,
  },
  {
    name: 'average',
    reaction: 530,
    reactionSd: 115,
    slip: 0.04,
    reflex: 0.13,
    holdSd: 65,
    tapGap: 150,
  },
  {
    name: 'good',
    reaction: 450,
    reactionSd: 90,
    slip: 0.025,
    reflex: 0.08,
    holdSd: 45,
    tapGap: 130,
  },
  {
    name: 'pro',
    reaction: 380,
    reactionSd: 70,
    slip: 0.012,
    reflex: 0.045,
    holdSd: 30,
    tapGap: 110,
  },
];

/**
 * A thumb past `pro`, for the Dereceli difficulties (`difficulty.ts`) only:
 * the rating's "elite" (~4540 Elo, Elmas) plays like this. Kept out of
 * `PROFILES`, whose runs are the engine's replay fixtures.
 */
export const ELITE: SkillProfile = {
  name: 'elite',
  reaction: 330,
  reactionSd: 55,
  slip: 0.007,
  reflex: 0.028,
  holdSd: 22,
  tapGap: 100,
};

export class Bot {
  private readonly rng: Rng;

  constructor(
    private readonly profile: SkillProfile,
    seed: number,
  ) {
    this.rng = new Rng(seed ^ 0x5bd1e995);
  }

  private chance(): number {
    return this.rng.int(1_000_000) / 1_000_000;
  }

  /** Box–Muller, clamped to what a thumb can do. */
  private normal(mean: number, sd: number): number {
    const u = Math.max(this.chance(), 1e-9);
    const v = this.chance();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + z * sd;
  }

  decide(run: Run): Action {
    const reel = run.current;
    const reaction = Math.max(
      170,
      Math.round(this.normal(this.profile.reaction, this.profile.reactionSd)),
    );
    const pressure = Math.max(0, reaction - reel.window * 0.7) / reel.window;
    const slip = this.profile.slip + pressure * 0.6;

    switch (reel.kind) {
      case 'skip': {
        if (reaction >= reel.window) return [GESTURE.none, 0, 0];
        return this.chance() < slip
          ? [GESTURE.like, reaction, 0]
          : [GESTURE.up, reaction, 0];
      }
      case 'like': {
        if (this.chance() < slip * 1.5) {
          return reaction < reel.window
            ? [GESTURE.up, reaction, 0]
            : [GESTURE.none, 0, 0];
        }
        const second = reaction + this.profile.tapGap;
        return second < reel.window
          ? [GESTURE.like, second, 0]
          : [GESTURE.none, 0, 0];
      }
      case 'hold': {
        if (reaction >= reel.window) return [GESTURE.none, 0, 0];
        if (this.chance() < slip * 0.5) return [GESTURE.up, reaction, 0];
        const target = (reel.zoneCenter * reel.holdFill) / 1000;
        const release = Math.round(this.normal(target, this.profile.holdSd));
        const held = Math.min(Math.max(1, release), run.holdFailAfter());
        return [GESTURE.hold, reaction, held];
      }
      case 'freeze': {
        const reflex = this.profile.reflex + pressure * 0.3;
        if (this.chance() < reflex) {
          const touch = Math.min(
            reel.window - 1,
            Math.round(reaction * 0.8),
          );
          return [GESTURE.touch, touch, 0];
        }
        return [GESTURE.none, 0, 0];
      }
    }
  }
}

/**
 * A thumb that swipes every reel `ms` after it goes live, without looking —
 * the player the blind-move penalty is for. On a freeze reel the swipe is a
 * touch.
 */
export function blindSwipe(run: Run, ms: number): Action {
  const reel = run.current;
  if (ms >= reel.window) return [GESTURE.none, 0, 0];
  return [reel.kind === 'freeze' ? GESTURE.touch : GESTURE.up, ms, 0];
}

/** Plays a whole run with one profile. Stops at `maxReels` as a quit. */
export function playRun(
  run: Run,
  profile: SkillProfile,
  botSeed: number,
  maxReels = 5000,
): Action[] {
  const bot = new Bot(profile, botSeed);
  const actions: Action[] = [];
  while (!run.over && actions.length < maxReels) {
    const action = bot.decide(run);
    actions.push(action);
    run.apply(action);
  }
  return actions;
}
