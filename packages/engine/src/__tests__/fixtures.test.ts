import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildBonuses,
  buildCurves,
  buildDifficulty,
  buildRejects,
  buildReplays,
  buildRules,
} from '../fixtures';
import { Run, replay } from '../run';

const read = (name: string): unknown =>
  JSON.parse(
    readFileSync(join(__dirname, '..', '..', 'fixtures', name), 'utf8'),
  );

/**
 * The committed fixtures are what the Laravel suite replays. If the rules
 * changed without `pnpm engine:fixtures`, the two engines would be tested
 * against different games — so a stale file fails here first.
 */
describe('fixtures', () => {
  it('replays.json is current', () => {
    expect(read('replays.json')).toEqual(
      JSON.parse(JSON.stringify(buildReplays())),
    );
  });

  it('rejects.json is current', () => {
    expect(read('rejects.json')).toEqual(
      JSON.parse(JSON.stringify(buildRejects())),
    );
  });

  it('curves.json is current', () => {
    expect(read('curves.json')).toEqual(
      JSON.parse(JSON.stringify(buildCurves())),
    );
  });

  it('bonuses.json is current', () => {
    expect(read('bonuses.json')).toEqual(
      JSON.parse(JSON.stringify(buildBonuses())),
    );
  });

  it('rules.json is current', () => {
    expect(read('rules.json')).toEqual(JSON.parse(JSON.stringify(buildRules())));
  });

  it('difficulty.json is current', () => {
    expect(read('difficulty.json')).toEqual(
      JSON.parse(JSON.stringify(buildDifficulty())),
    );
  });

  it('every difficulty replay replays to its summary at its difficulty', () => {
    const { replays, steps } = buildDifficulty();
    for (const fixture of replays) {
      expect(replay(fixture.seed, fixture.actions, fixture.difficulty)).toEqual(fixture.summary);
    }
    const blinds = new Set(steps.flatMap((fixture) => fixture.steps.map((step) => step.blind)));
    expect([...blinds]).toEqual(expect.arrayContaining([0, 1, 2]));
  });

  it('every replay fixture replays to its summary', () => {
    for (const fixture of buildReplays()) {
      expect(replay(fixture.seed, fixture.actions)).toEqual(fixture.summary);
    }
  });

  it('every step log replays reel by reel', () => {
    for (const fixture of buildBonuses()) {
      const run = new Run(fixture.seed);
      fixture.actions.forEach((action, i) => {
        const step = run.apply(action);
        expect({
          index: step.reel.index,
          kind: step.reel.kind,
          verdict: step.verdict,
          points: step.points,
          combo: step.combo,
          bonuses: [...step.bonuses],
          blind: step.blind,
          meter: step.meter,
        }).toEqual(fixture.steps[i]);
      });
    }
  });
});
