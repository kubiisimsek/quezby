import { describe, expect, it } from 'vitest';

import { buildBonuses } from '../fixtures';
import { ReelStream } from '../reels';
import { BONUS_KINDS, RULES, bonusFor } from '../rules';
import { GESTURE, Run, type Action, type Step } from '../run';

/** Hits every reel: swipes and likes after `decideMs`, holds dead centre, leaves freezes alone. */
function clean(run: Run, decideMs = 300): Action {
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

function play(seed: number, reels: number, pick: (run: Run) => Action): Step[] {
  const run = new Run(seed);
  const steps: Step[] = [];
  while (steps.length < reels && !run.over) steps.push(run.apply(pick(run)));
  return steps;
}

const kinds = (step: Step | undefined) => (step?.bonuses ?? []).map((bonus) => bonus.kind);

describe('named combos', () => {
  it('pays a flawless level on the twentieth reel of a level with no miss', () => {
    const steps = play(42, 40, (run) => clean(run));
    expect(kinds(steps[19])).toContain('flawless');
    expect(steps[19]!.bonuses.find((b) => b.kind === 'flawless')!.points).toBe(bonusFor('flawless', 19));
    expect(kinds(steps[39])).toContain('flawless');
    expect(steps.slice(0, 19).some((step) => kinds(step).includes('flawless'))).toBe(false);
  });

  it('pays no flawless level once the level had a miss, but pays the next clean one', () => {
    const steps = play(42, 40, (run) =>
      run.summary().reels === 3 && run.current.kind === 'skip'
        ? [GESTURE.none, 0, 0]
        : clean(run),
    );
    expect(steps[3]!.verdict).toBe('timeout');
    expect(kinds(steps[19])).not.toContain('flawless');
    expect(kinds(steps[39])).toContain('flawless');
  });

  it('strikes lightning on the fifth fast skip or like hit in a row, holds and freezes aside', () => {
    // Seed 1 opens with the intro: skip, skip, like, skip, hold, skip, freeze, skip.
    const steps = play(1, 8, (run) => clean(run, 300));
    expect(steps.map((step) => step.reel.kind)).toEqual([...RULES.intro]);
    expect(kinds(steps[3])).not.toContain('lightning');
    expect(kinds(steps[5])).toContain('lightning');
    expect(steps[5]!.bonuses.find((b) => b.kind === 'lightning')!.points).toBe(bonusFor('lightning', 5));
  });

  it('breaks the lightning chain on a slow decision', () => {
    const steps = play(1, 8, (run) => clean(run, run.summary().reels === 3 ? 800 : 300));
    expect(steps.some((step) => kinds(step).includes('lightning'))).toBe(false);
  });

  it('lets a like count until 700 ms but a skip only until 550 ms', () => {
    expect(RULES.lightningMs.skip).toBe(550);
    expect(RULES.lightningMs.like).toBe(700);
    const steps = play(1, 8, (run) => clean(run, run.current.kind === 'like' ? 700 : 550));
    expect(kinds(steps[5])).toContain('lightning');
  });

  it('calls it cool-headed to leave a freeze alone straight after a like or a hold', () => {
    const stream = new ReelStream(42);
    let previous = stream.next();
    let at = -1;
    for (let n = 1; n < 500; n += 1) {
      const reel = stream.next();
      if (reel.kind === 'freeze' && (previous.kind === 'like' || previous.kind === 'hold')) {
        at = n;
        break;
      }
      previous = reel;
    }
    expect(at).toBeGreaterThan(0);
    const steps = play(42, at + 1, (run) => clean(run));
    expect(kinds(steps[at])).toContain('coolHead');
    // The intro's freeze follows an ordinary reel: no bonus there.
    expect(kinds(steps[6])).not.toContain('coolHead');
  });

  it('pays a comeback once per dip below the low mark, when a hit climbs back to half', () => {
    const fixture = buildBonuses().find((run) => run.name === 'comeback')!;
    const at = fixture.steps.findIndex((step) => step.bonuses.some((b) => b.kind === 'comeback'));
    expect(at).toBeGreaterThan(0);
    expect(fixture.steps[at]!.meter).toBeGreaterThanOrEqual(RULES.comebackHigh);
    const dip = fixture.steps.slice(0, at).findIndex((step) => step.meter < RULES.comebackLow);
    expect(dip).toBeGreaterThanOrEqual(0);
    const later = fixture.steps.slice(at + 1).filter((step) => step.bonuses.some((b) => b.kind === 'comeback'));
    const dippedAgain = fixture.steps.slice(at + 1).some((step) => step.meter < RULES.comebackLow);
    expect(later.length === 0 || dippedAgain).toBe(true);
  });

  it('adds named combos to the score without the combo multiplier, and counts them', () => {
    const run = new Run(42);
    let reelPoints = 0;
    let bonusPoints = 0;
    const counts = Object.fromEntries(BONUS_KINDS.map((kind) => [kind, 0])) as Record<
      (typeof BONUS_KINDS)[number],
      number
    >;
    while (run.summary().reels < 120 && !run.over) {
      const index = run.current.index;
      const step = run.apply(clean(run));
      reelPoints += step.points;
      for (const bonus of step.bonuses) {
        expect(bonus.points).toBe(bonusFor(bonus.kind, index));
        bonusPoints += bonus.points;
        counts[bonus.kind] += 1;
      }
    }
    const summary = run.summary();
    expect(summary.bonusPoints).toBe(bonusPoints);
    expect(summary.score).toBe(reelPoints + bonusPoints);
    expect(summary.bonuses).toEqual(counts);
  });
});
