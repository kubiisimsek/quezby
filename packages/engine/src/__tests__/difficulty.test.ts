import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DIFFICULTIES, MAX_DIFFICULTY, difficultyRules, gainAt, gainsAt, lossAt } from '../difficulty';
import { RULES, penaltyFor } from '../rules';
import { GESTURE, Run, replay, type Action, type RunSummary } from '../run';

const replays = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'fixtures', 'replays.json'), 'utf8'),
) as Array<{ seed: number; actions: Action[]; summary: RunSummary }>;

describe('difficulty table', () => {
  it('has seventeen rows, and row 0 changes nothing', () => {
    expect(DIFFICULTIES).toHaveLength(17);
    expect(MAX_DIFFICULTY).toBe(16);
    expect(DIFFICULTIES[0]).toEqual({ gain: 1000, penalty: 1000 });
  });

  it('follows its formula on every row: ×0.81 gain and ×1.64 loss at the top', () => {
    DIFFICULTIES.forEach((row, z) => {
      expect(row).toEqual({ gain: 1000 - 12 * z, penalty: 1000 + 40 * z });
    });
    expect(DIFFICULTIES[MAX_DIFFICULTY]).toEqual({ gain: 808, penalty: 1640 });
  });

  it('never gets easier from one difficulty to the next', () => {
    for (let z = 1; z <= MAX_DIFFICULTY; z += 1) {
      const [lower, upper] = [DIFFICULTIES[z - 1]!, DIFFICULTIES[z]!];
      expect(upper.gain).toBeLessThan(lower.gain);
      expect(upper.penalty).toBeGreaterThan(lower.penalty);
    }
  });

  it('refuses a difficulty that is not a row', () => {
    for (const bad of [-1, 17, 1.5, Number.NaN]) {
      expect(() => difficultyRules(bad)).toThrow(RangeError);
      expect(() => new Run(42, bad)).toThrow(RangeError);
    }
  });

  it('scales a hit’s gain and a miss’s loss by its row', () => {
    expect(gainsAt(0)).toEqual(RULES.gain);
    expect(gainsAt(16)).toEqual({ skip: 64, like: 72, hold: 80, freeze: 72 });
    expect(gainAt(RULES.gain.skip, 8)).toBe(Math.floor((80 * 904) / 1000));
    expect(lossAt(RULES.loss.caught, 0)).toBe(300);
    expect(lossAt(RULES.loss.caught, 16)).toBe(492);
    expect(lossAt(RULES.loss.holdMiss, 16)).toBe(246);
    expect(lossAt(RULES.loss.timeout, 16)).toBe(410);
  });
});

/** The action that hits the reel on screen cleanly — a hold released at the zone's centre. */
function clean(run: Run): Action {
  const reel = run.current;
  switch (reel.kind) {
    case 'skip':
      return [GESTURE.up, 400, 0];
    case 'like':
      return [GESTURE.like, 400, 0];
    case 'freeze':
      return [GESTURE.none, 0, 0];
    case 'hold':
      return [GESTURE.hold, 300, Math.round((reel.zoneCenter * reel.holdFill) / 1000)];
  }
}

describe('a run at a difficulty', () => {
  it('replays every engine fixture the same at difficulty 0', () => {
    for (const fixture of replays) {
      expect(replay(fixture.seed, fixture.actions, 0)).toEqual(fixture.summary);
    }
  });

  it('plays the same feed at every difficulty: the same reels, windows and drain', () => {
    for (const seed of [42, 7919, 123456789]) {
      const plain = new Run(seed);
      const hard = new Run(seed, MAX_DIFFICULTY);
      let reels = 0;
      while (!plain.over && !hard.over && reels < 400) {
        expect(hard.current).toEqual(plain.current);
        const action = clean(plain);
        plain.apply(action);
        hard.apply(action);
        reels += 1;
      }
      expect(reels).toBeGreaterThan(100);
    }
  });

  it('takes more on a miss and gives less on a hit, but leaves a perfect’s extra whole', () => {
    // The drain is the same at both, so the meters part by the gains and losses alone.
    const plain = new Run(42);
    const hard = new Run(42, MAX_DIFFICULTY);
    const both = (action: Action) => [plain.apply(action), hard.apply(action)] as const;

    let [a, b] = both([GESTURE.none, 0, 0]);
    expect(a.meter - b.meter).toBe(410 - 250);
    [a, b] = both([GESTURE.up, 400, 0]);
    expect(a.meter - b.meter).toBe(160 + (80 - 64));
    [a, b] = both([GESTURE.like, 400, 0]);
    expect(a.meter - b.meter).toBe(176 + (90 - 72));
    [a, b] = both([GESTURE.up, 400, 0]);
    expect(a.meter - b.meter).toBe(194 + (80 - 64));
    expect(plain.current.kind).toBe('hold');
    [a, b] = both(clean(plain));
    expect(a.verdict).toBe('perfect');
    expect(b.verdict).toBe('perfect');
    // 100 + 60 against 80 + 60: the perfect's 60 is not cut.
    expect(a.meter - b.meter).toBe(210 + (100 - 80));
    expect(a.points).toBe(b.points);
  });

  it('charges a blind move the bigger loss', () => {
    const run = new Run(42, MAX_DIFFICULTY);
    run.apply([GESTURE.up, 400, 0]);
    const blind = run.apply([GESTURE.like, 200, 0]);
    expect(blind.verdict).toBe('wrong');
    expect(blind.blind).toBe(1);
    const before = new Run(42, MAX_DIFFICULTY);
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
    expect(untilEmpty(MAX_DIFFICULTY)).toBeLessThan(untilEmpty(0));
  });
});
