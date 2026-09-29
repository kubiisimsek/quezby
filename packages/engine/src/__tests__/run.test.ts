import { describe, expect, it } from 'vitest';

import { PROFILES, blindSwipe, playRun } from '../bot';
import { RULES, levelBoostFor, penaltyFor } from '../rules';
import { EngineError, GESTURE, Run, replay, type Action } from '../run';

/** Plays the intro perfectly and fast, returning the run at reel 8. */
function pastIntro(seed = 42): Run {
  const run = new Run(seed);
  while (run.current.index < RULES.intro.length) {
    run.apply(perfectAction(run));
  }
  return run;
}

function perfectAction(run: Run): Action {
  const reel = run.current;
  switch (reel.kind) {
    case 'skip':
      return [GESTURE.up, 300, 0];
    case 'like':
      return [GESTURE.like, 300, 0];
    case 'freeze':
      return [GESTURE.none, 0, 0];
    case 'hold':
      return [
        GESTURE.hold,
        300,
        Math.round((reel.zoneCenter * reel.holdFill) / 1000),
      ];
  }
}

describe('Run', () => {
  it('scores a fast swipe on the first reel with the full speed bonus', () => {
    const run = new Run(1);
    const step = run.apply([GESTURE.up, RULES.speedFloor, 0]);
    expect(step.verdict).toBe('hit');
    expect(step.combo).toBe(1050);
    expect(step.points).toBe(Math.floor((RULES.base.skip * 2 * 1000 * 1050) / 1_000_000));
    expect(step.bonuses).toEqual([]);
  });

  it('pays no speed bonus at the very end of the window', () => {
    const run = new Run(1);
    const step = run.apply([GESTURE.up, run.current.window - 1, 0]);
    expect(step.points).toBe(Math.floor((RULES.base.skip * 1000 * 1050) / 1_000_000));
  });

  it('builds the combo hit by hit and halves it on a miss', () => {
    const run = new Run(1);
    expect(run.currentCombo).toBe(1000);
    run.apply([GESTURE.up, 300, 0]);
    run.apply([GESTURE.up, 300, 0]);
    expect(run.currentCombo).toBe(1100);
    const miss = run.apply([GESTURE.up, 300, 0]);
    expect(miss.verdict).toBe('wrong');
    expect(miss.combo).toBe(0);
    expect(miss.points).toBe(0);
    expect(run.currentCombo).toBe(1050);
    expect(run.summary().maxCombo).toBe(1100);
  });

  it('drains the meter for the time spent, then refills it on a hit', () => {
    const run = new Run(1);
    const reel = run.current;
    const step = run.apply([GESTURE.up, 1000, 0]);
    const drained = Math.floor((reel.drain * 1000) / 1000);
    expect(step.meter).toBe(
      Math.min(RULES.meterMax, RULES.meterMax - drained + RULES.gain.skip),
    );
  });

  it('punishes a timeout and resets the streak', () => {
    const run = new Run(1);
    run.apply([GESTURE.up, 300, 0]);
    expect(run.currentStreak).toBe(1);
    const step = run.apply([GESTURE.none, 0, 0]);
    expect(step.verdict).toBe('timeout');
    expect(step.points).toBe(0);
    expect(run.currentStreak).toBe(0);
  });

  it('calls a swipe on a friend’s post wrong', () => {
    const run = new Run(1);
    run.apply([GESTURE.up, 300, 0]);
    run.apply([GESTURE.up, 300, 0]);
    expect(run.current.kind).toBe('like');
    expect(run.apply([GESTURE.up, 300, 0]).verdict).toBe('wrong');
  });

  describe('blind moves', () => {
    /** Seed 1 opens skip, skip, like: the run standing on its first friend's post. */
    function atTheLike(): Run {
      const run = new Run(1);
      run.apply([GESTURE.up, 400, 0]);
      run.apply([GESTURE.up, 400, 0]);
      expect(run.current.kind).toBe('like');
      return run;
    }

    it('doubles the penalty of a swipe on the wrong post made too soon to have looked', () => {
      const run = atTheLike();
      const before = run.meter;
      const drain = Math.floor((run.current.drain * 299) / 1000);
      const step = run.apply([GESTURE.up, RULES.blindMs - 1, 0]);
      expect(step.verdict).toBe('wrong');
      expect(step.blind).toBe(1);
      expect(step.meter).toBe(before - drain - RULES.loss.wrong * 2);
    });

    it('counts a quick double tap on the wrong post as blind too', () => {
      const run = new Run(1);
      const step = run.apply([GESTURE.like, 250, 0]);
      expect(step.verdict).toBe('wrong');
      expect(step.blind).toBe(1);
    });

    it('keeps the plain penalty for a wrong move made after a look', () => {
      const run = atTheLike();
      const step = run.apply([GESTURE.up, RULES.blindMs, 0]);
      expect(step.verdict).toBe('wrong');
      expect(step.blind).toBe(0);
    });

    it('never calls a timeout, a missed hold or a touched freeze reel blind', () => {
      const timeout = new Run(1).apply([GESTURE.none, 0, 0]);
      expect([timeout.verdict, timeout.blind]).toEqual(['timeout', 0]);

      const hold = new Run(3);
      for (let i = 0; i < 4; i += 1) hold.apply(perfectAction(hold));
      const early = hold.apply([GESTURE.hold, 100, 10]);
      expect([early.verdict, early.blind]).toEqual(['holdEarly', 0]);

      const freeze = new Run(9);
      for (let i = 0; i < 6; i += 1) freeze.apply(perfectAction(freeze));
      const caught = freeze.apply([GESTURE.touch, 100, 0]);
      expect([caught.verdict, caught.blind]).toEqual(['caught', 0]);

      // A press held on a skip reel is the wrong move, but not a blind one.
      const pressed = new Run(1).apply([GESTURE.hold, 100, 400]);
      expect([pressed.verdict, pressed.blind]).toEqual(['wrong', 0]);
    });

    it('doubles again for each blind move in a row, while fast hits never forgive', () => {
      const run = new Run(1);
      expect(run.apply([GESTURE.like, 250, 0]).blind).toBe(1);
      run.apply([GESTURE.up, 200, 0]);
      const second = run.apply([GESTURE.up, 200, 0]);
      expect(second.reel.kind).toBe('like');
      expect(second.blind).toBe(2);
      expect(second.over).toBe(true);
      expect(run.summary().endedBy).toBe('penalty');
    });

    it('starts over after a considered hit', () => {
      const run = new Run(1);
      expect(run.apply([GESTURE.like, 250, 0]).blind).toBe(1);
      expect(run.apply([GESTURE.up, RULES.blindMs, 0]).verdict).toBe('hit');
      expect(run.apply([GESTURE.up, 200, 0]).blind).toBe(1);
    });

    it('lets a hold or a freeze reel left alone count as a look', () => {
      const run = new Run(3);
      run.apply([GESTURE.up, 200, 0]);
      run.apply([GESTURE.up, 200, 0]);
      expect(run.apply([GESTURE.up, 200, 0]).blind).toBe(1);
      run.apply([GESTURE.up, 200, 0]);
      expect(run.current.kind).toBe('hold');
      expect(['hit', 'perfect']).toContain(run.apply(perfectAction(run)).verdict);
      expect(run.apply([GESTURE.like, 250, 0]).blind).toBe(1);
      expect(run.current.kind).toBe('freeze');
      expect(run.apply([GESTURE.none, 0, 0]).verdict).toBe('hit');
      expect(run.apply([GESTURE.like, 250, 0]).blind).toBe(1);
    });

    it('costs a loss doubled once per blind move', () => {
      expect([0, 1, 2, 3].map((blind) => penaltyFor(RULES.loss.wrong, blind))).toEqual([
        200, 400, 800, 1600,
      ]);
    });

    it('ends a player who swipes everything within the intro, on every seed', () => {
      for (const seed of [1, 42, 7919, 123456789]) {
        for (const ms of [150, 200, RULES.blindMs - 1]) {
          const run = new Run(seed);
          while (!run.over) run.apply(blindSwipe(run, ms));
          const summary = run.summary();
          expect(summary.endedBy).toBe('penalty');
          expect(summary.reels).toBeLessThanOrEqual(RULES.intro.length);
        }
      }
    });
  });

  it('judges a hold by where the bar stopped', () => {
    const early = new Run(3);
    for (let i = 0; i < 4; i += 1) early.apply(perfectAction(early));
    expect(early.current.kind).toBe('hold');
    const reel = early.current;
    expect(early.apply([GESTURE.hold, 300, 10]).verdict).toBe('holdEarly');

    const late = new Run(3);
    for (let i = 0; i < 4; i += 1) late.apply(perfectAction(late));
    expect(late.apply([GESTURE.hold, 300, late.holdFailAfter()]).verdict).toBe(
      'holdLate',
    );

    const centre = new Run(3);
    for (let i = 0; i < 4; i += 1) centre.apply(perfectAction(centre));
    const step = centre.apply([
      GESTURE.hold,
      300,
      Math.round((reel.zoneCenter * reel.holdFill) / 1000),
    ]);
    expect(step.verdict).toBe('perfect');
    expect(step.combo).toBe(1250);
    expect(step.points).toBe(
      Math.floor(
        ((RULES.base.hold + RULES.precisionBonus) * levelBoostFor(reel.index) * 1250) /
          1_000_000,
      ),
    );
  });

  it('holdFailAfter is the first hold that is late', () => {
    const run = new Run(3);
    for (let i = 0; i < 4; i += 1) run.apply(perfectAction(run));
    const reel = run.current;
    const after = run.holdFailAfter();
    const fillAt = (d: number) => Math.floor((d * 1000) / reel.holdFill);
    expect(fillAt(after)).toBeGreaterThan(reel.zoneCenter + reel.zoneHalf);
    expect(fillAt(after - 1)).toBeLessThanOrEqual(reel.zoneCenter + reel.zoneHalf);
  });

  it('rewards leaving a freeze reel alone and punishes touching it', () => {
    const left = new Run(9);
    for (let i = 0; i < 6; i += 1) left.apply(perfectAction(left));
    expect(left.current.kind).toBe('freeze');
    expect(left.apply([GESTURE.none, 0, 0]).verdict).toBe('hit');

    const touched = new Run(9);
    for (let i = 0; i < 6; i += 1) touched.apply(perfectAction(touched));
    expect(touched.apply([GESTURE.touch, 120, 0]).verdict).toBe('caught');
  });

  it('ends the run when the meter runs dry mid-reel', () => {
    const run = pastIntro();
    let step = run.apply([GESTURE.none, 0, 0]);
    while (!step.over) step = run.apply([GESTURE.none, 0, 0]);
    expect(['drained', 'penalty']).toContain(run.summary().endedBy);
    expect(run.meter).toBe(0);
    expect(() => run.apply([GESTURE.none, 0, 0])).toThrow(EngineError);
  });

  it('counts a drained reel as neither hit nor miss', () => {
    const run = pastIntro();
    for (let i = 0; i < 5000 && run.msUntilEmpty() > run.current.window; i += 1) {
      const action = perfectAction(run);
      const active = action[1] + action[2];
      run.apply(active < run.msUntilEmpty() ? action : [GESTURE.up, 300, 0]);
    }
    expect(run.over).toBe(false);
    expect(run.msUntilEmpty()).toBeLessThanOrEqual(run.current.window);

    const before = run.summary();
    const step = run.apply([GESTURE.none, 0, 0]);
    const after = run.summary();
    expect(step.verdict).toBe('drained');
    expect(after.reels).toBe(before.reels);
    expect(after.hits + after.misses).toBe(before.hits + before.misses);
    expect(after.endedBy).toBe('drained');
  });

  it('refuses logs the app could not have produced', () => {
    const run = new Run(1);
    expect(() => run.apply([GESTURE.up, run.current.window, 0])).toThrow(
      /late_action/,
    );
    expect(() => run.apply([GESTURE.touch, 100, 0])).toThrow(
      /gesture_not_allowed/,
    );
    expect(() => run.apply([GESTURE.up, 100, 5])).toThrow(/malformed_action/);
    expect(() => run.apply([GESTURE.none, 3, 0])).toThrow(/malformed_action/);
  });

  it('replays a live run to the same summary', () => {
    for (const profile of PROFILES) {
      const live = new Run(777);
      const actions = playRun(live, profile, 3);
      expect(replay(777, actions)).toEqual(live.summary());
    }
  });

  it('treats a log that stops early as a quit', () => {
    const summary = replay(5, [[GESTURE.up, 300, 0]]);
    expect(summary.endedBy).toBe('quit');
    expect(summary.reels).toBe(1);
  });

  it('keeps every score an integer and inside 32 bits per reel', () => {
    const run = new Run(31337);
    const actions = playRun(run, PROFILES[3]!, 8);
    const summary = run.summary();
    expect(Number.isInteger(summary.score)).toBe(true);
    expect(summary.score).toBeGreaterThan(0);
    expect(summary.bonusPoints).toBeLessThan(summary.score);

    let total = 0;
    const again = new Run(31337);
    for (const action of actions) {
      const step = again.apply(action);
      expect(Number.isInteger(step.points)).toBe(true);
      expect(step.points).toBeLessThan(2 ** 31);
      total += step.points + step.bonuses.reduce((sum, bonus) => sum + bonus.points, 0);
    }
    expect(total).toBe(summary.score);
  });
});
