import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DIFFICULTIES,
  MAX_DIFFICULTY,
  difficultyRules,
  drainAt,
  likeWeightAt,
  lossAt,
  specialShareAt,
} from '../difficulty';
import { ReelStream } from '../reels';
import { RULES, drainFor, penaltyFor, specialShareFor, windowFor } from '../rules';
import { GESTURE, Run, replay, type Action, type RunSummary } from '../run';

const replays = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'fixtures', 'replays.json'), 'utf8'),
) as Array<{ seed: number; actions: Action[]; summary: RunSummary }>;

describe('difficulty table', () => {
  it('has seventeen rows, and row 0 changes nothing', () => {
    expect(DIFFICULTIES).toHaveLength(17);
    expect(MAX_DIFFICULTY).toBe(16);
    expect(DIFFICULTIES[0]).toEqual({ special: 0, freeze: 0, penalty: 1000, drain: 1000 });
  });

  it('follows its formula on every row', () => {
    DIFFICULTIES.forEach((row, z) => {
      expect(row).toEqual({
        special: 15 * z,
        freeze: Math.floor((5 * z) / 8),
        penalty: 1000 + 30 * z,
        drain: 1000 + Math.floor((3 * z * z) / 2),
      });
    });
  });

  it('never gets easier from one difficulty to the next', () => {
    for (let z = 1; z <= MAX_DIFFICULTY; z += 1) {
      const [lower, upper] = [DIFFICULTIES[z - 1]!, DIFFICULTIES[z]!];
      expect(upper.special).toBeGreaterThan(lower.special);
      expect(upper.freeze).toBeGreaterThanOrEqual(lower.freeze);
      expect(upper.penalty).toBeGreaterThan(lower.penalty);
      expect(upper.drain).toBeGreaterThan(lower.drain);
    }
  });

  it('refuses a difficulty that is not a row', () => {
    for (const bad of [-1, 17, 1.5, Number.NaN]) {
      expect(() => difficultyRules(bad)).toThrow(RangeError);
      expect(() => new Run(42, bad)).toThrow(RangeError);
    }
  });

  it('moves the curves by its row', () => {
    expect(specialShareAt(100, 0)).toBe(specialShareFor(100));
    expect(specialShareAt(100, 16)).toBe(specialShareFor(100) + 240);
    expect(likeWeightAt(0)).toBe(RULES.weightLike);
    expect(likeWeightAt(16)).toBe(RULES.weightLike - 10);
    expect(drainAt(600, 0)).toBe(drainFor(600));
    expect(drainAt(600, 16)).toBe(Math.floor((drainFor(600) * 1384) / 1000));
    expect(lossAt(RULES.loss.caught, 0)).toBe(250);
    expect(lossAt(RULES.loss.caught, 16)).toBe(370);
    expect(lossAt(RULES.loss.holdMiss, 16)).toBe(177);
  });
});

describe('a run at a difficulty', () => {
  it('replays every engine fixture the same at difficulty 0', () => {
    for (const fixture of replays) {
      expect(replay(fixture.seed, fixture.actions, 0)).toEqual(fixture.summary);
    }
  });

  it('keeps the intro and reads the same draws from the seed', () => {
    const plain = new ReelStream(7919);
    const hard = new ReelStream(7919, MAX_DIFFICULTY);
    for (let n = 0; n < 400; n += 1) {
      const a = plain.next();
      const b = hard.next();
      if (n < RULES.intro.length) expect(b.kind).toBe(a.kind);
      expect(b.window).toBe(windowFor(b.kind, n));
      // The zone's centre is the reel's third draw: a hold at the same index sits at the same place.
      if (a.kind === 'hold' && b.kind === 'hold') expect(b.zoneCenter).toBe(a.zoneCenter);
      expect(b.drain).toBe(drainAt(n, MAX_DIFFICULTY));
    }
  });

  it('brings more special reels, and more of them freeze reels', () => {
    const count = (difficulty: number) => {
      const stream = new ReelStream(42, difficulty);
      const kinds = Array.from({ length: 3000 }, () => stream.next().kind);
      return {
        special: kinds.filter((kind) => kind !== 'skip').length,
        freeze: kinds.filter((kind) => kind === 'freeze').length,
      };
    };
    const easy = count(0);
    const hard = count(MAX_DIFFICULTY);
    expect(hard.special).toBeGreaterThan(easy.special * 1.3);
    expect(hard.freeze).toBeGreaterThan(easy.freeze * 1.5);
  });

  it('keeps the feed fair: never four specials in a row, never two freeze reels side by side', () => {
    const stream = new ReelStream(123456789, MAX_DIFFICULTY);
    let specialRun = 0;
    let previous = '';
    for (let n = 0; n < 5000; n += 1) {
      const { kind } = stream.next();
      specialRun = kind === 'skip' ? 0 : specialRun + 1;
      expect(specialRun).toBeLessThanOrEqual(RULES.maxSpecialRun);
      if (kind === 'freeze') expect(previous).not.toBe('freeze');
      previous = kind;
    }
  });

  it('makes a miss cost more, and a blind move doubles the bigger loss', () => {
    const missAt = (difficulty: number) => {
      const run = new Run(42, difficulty);
      return run.apply([GESTURE.none, 0, 0]);
    };
    const drainOf = (difficulty: number) =>
      Math.floor((drainAt(0, difficulty) * new Run(42).current.window) / 1000);
    expect(1000 - missAt(0).meter).toBe(drainOf(0) + RULES.loss.timeout);
    expect(1000 - missAt(16).meter).toBe(drainOf(16) + 296);

    const run = new Run(42, 16);
    run.apply([GESTURE.up, 400, 0]);
    const blind = run.apply([GESTURE.like, 200, 0]);
    expect(blind.verdict).toBe('wrong');
    expect(blind.blind).toBe(1);
    const before = new Run(42, 16);
    before.apply([GESTURE.up, 400, 0]);
    const drained = Math.floor((before.current.drain * 200) / 1000);
    expect(before.meter - drained - blind.meter).toBe(penaltyFor(lossAt(RULES.loss.wrong, 16), 1));
  });

  it('empties the meter sooner the harder it gets', () => {
    const untilEmpty = (difficulty: number) => {
      const run = new Run(1, difficulty);
      let reels = 0;
      while (!run.over) {
        run.apply([GESTURE.none, 0, 0]);
        reels += 1;
      }
      return reels;
    };
    expect(untilEmpty(MAX_DIFFICULTY)).toBeLessThanOrEqual(untilEmpty(0));
    expect(new Run(1, MAX_DIFFICULTY).msUntilEmpty()).toBeLessThan(new Run(1).msUntilEmpty());
  });
});
