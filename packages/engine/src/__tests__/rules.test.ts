import { describe, expect, it } from 'vitest';

import { Rng } from '../rng';
import { ReelStream } from '../reels';
import {
  BONUS_KINDS,
  RULES,
  baseWindow,
  bonusFor,
  capsFor,
  comboAfterHit,
  comboAfterMiss,
  drainFor,
  holdFillFor,
  levelBoostFor,
  levelFor,
  specialShareFor,
  windowFor,
  zoneWidthFor,
} from '../rules';

describe('Rng', () => {
  it('gives the same sequence for the same seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i += 1) expect(a.next()).toBe(b.next());
  });

  it('stays inside unsigned 32 bits and inside int(max)', () => {
    const rng = new Rng(4294967295);
    for (let i = 0; i < 5000; i += 1) {
      const value = rng.next();
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(4294967296);
      const small = rng.int(401);
      expect(small).toBeGreaterThanOrEqual(0);
      expect(small).toBeLessThan(401);
    }
  });

  it('does not stall on a zero seed', () => {
    const rng = new Rng(0);
    expect(rng.next()).not.toBe(0);
  });
});

describe('curves', () => {
  it('start where the rules say', () => {
    expect(baseWindow(0)).toBe(RULES.windowMax);
    expect(holdFillFor(0)).toBe(RULES.holdFillMax);
    expect(zoneWidthFor(0)).toBe(RULES.zoneMax);
    expect(specialShareFor(0)).toBe(RULES.specialBase);
    expect(drainFor(0)).toBe(RULES.drainBase);
  });

  it('only ever get harder', () => {
    for (let n = 1; n < 3000; n += 1) {
      expect(baseWindow(n)).toBeLessThanOrEqual(baseWindow(n - 1));
      expect(holdFillFor(n)).toBeLessThanOrEqual(holdFillFor(n - 1));
      expect(zoneWidthFor(n)).toBeLessThanOrEqual(zoneWidthFor(n - 1));
      expect(specialShareFor(n)).toBeGreaterThanOrEqual(specialShareFor(n - 1));
      expect(drainFor(n)).toBeGreaterThanOrEqual(drainFor(n - 1));
    }
  });

  it('never ask for less than a human can do', () => {
    for (const n of [0, 100, 1000, 100000]) {
      expect(baseWindow(n)).toBeGreaterThanOrEqual(RULES.windowMin);
      expect(windowFor('freeze', n)).toBeGreaterThanOrEqual(RULES.freezeMin);
      expect(windowFor('like', n)).toBe(baseWindow(n) + RULES.likeExtra);
    }
  });

  it('never stop draining harder, so every run ends', () => {
    expect(drainFor(10000)).toBeGreaterThan(drainFor(1000));
  });

  it('drains a little faster every six reels, and steeply once the run is long', () => {
    expect(drainFor(0)).toBe(60);
    expect(drainFor(5)).toBe(60);
    expect(drainFor(6)).toBe(61);
    expect(drainFor(100)).toBe(60 + 16 + 3);
    expect(drainFor(300)).toBe(60 + 50 + 30);
    expect(drainFor(600)).toBe(60 + 100 + 120);
  });

  it('levels every twenty reels', () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(19)).toBe(1);
    expect(levelFor(20)).toBe(2);
  });

  it('raises the level multiplier by the same step every level', () => {
    expect(levelBoostFor(0)).toBe(1000);
    expect(levelBoostFor(19)).toBe(1000);
    expect(levelBoostFor(20)).toBe(1200);
    expect(levelBoostFor(180)).toBe(2800);
    expect(levelBoostFor(380)).toBe(4800);
    for (let n = 20; n < 100_000; n += 997) {
      expect(levelBoostFor(n) - levelBoostFor(n - 20)).toBe(RULES.levelBoostStep);
    }
  });

  it('builds the combo by a step per hit up to x1,50', () => {
    let combo: number = RULES.comboStart;
    for (let hit = 1; hit <= 10; hit += 1) {
      combo = comboAfterHit(combo);
      expect(combo).toBe(1000 + hit * 50);
    }
    expect(comboAfterHit(combo)).toBe(RULES.comboMax);
    expect(comboAfterHit(1475)).toBe(1500);
  });

  it('halves what a miss finds above x1', () => {
    expect(comboAfterMiss(1500)).toBe(1250);
    expect(comboAfterMiss(1250)).toBe(1125);
    expect(comboAfterMiss(1125)).toBe(1062);
    expect(comboAfterMiss(1001)).toBe(1000);
    expect(comboAfterMiss(1000)).toBe(1000);
  });

  it('pays named combos by the level multiplier', () => {
    for (const kind of BONUS_KINDS) {
      expect(bonusFor(kind, 0)).toBe(RULES.bonus[kind]);
      expect(bonusFor(kind, 200)).toBe(RULES.bonus[kind] * 3);
    }
  });
});

describe('ReelStream', () => {
  it('opens with the intro that teaches all four reels', () => {
    const stream = new ReelStream(7);
    const kinds = RULES.intro.map(() => stream.next().kind);
    expect(kinds).toEqual([...RULES.intro]);
  });

  it('is the same feed for the same seed', () => {
    const a = new ReelStream(123);
    const b = new ReelStream(123);
    for (let i = 0; i < 500; i += 1) expect(a.next()).toEqual(b.next());
  });

  it('never shows two freeze reels in a row or too many specials', () => {
    for (const seed of [1, 2, 3, 99, 1000]) {
      const stream = new ReelStream(seed);
      let previous = '';
      let specials = 0;
      for (let i = 0; i < 2000; i += 1) {
        const reel = stream.next();
        if (i >= RULES.intro.length) {
          expect(previous === 'freeze' && reel.kind === 'freeze').toBe(false);
        }
        specials = reel.kind === 'skip' ? 0 : specials + 1;
        if (i >= RULES.intro.length) {
          expect(specials).toBeLessThanOrEqual(RULES.maxSpecialRun);
        }
        previous = reel.kind;
      }
    }
  });

  it('never holds more holds or freezes in any ten reels than the level allows', () => {
    for (const seed of [1, 2, 3, 99, 1000, 7919]) {
      const stream = new ReelStream(seed);
      const kinds: string[] = [];
      for (let n = 0; n < 1500; n += 1) {
        kinds.push(stream.next().kind);
        if (n < RULES.intro.length) continue;
        const window = kinds.slice(Math.max(0, n - RULES.capWindow + 1));
        const caps = capsFor(n);
        expect(window.filter((kind) => kind === 'hold').length).toBeLessThanOrEqual(caps.hold);
        expect(window.filter((kind) => kind === 'freeze').length).toBeLessThanOrEqual(caps.freeze);
      }
    }
  });

  it('lets a second freeze in from level 9 and a second hold from level 17', () => {
    expect(capsFor(0)).toEqual({ fromReel: 0, hold: 1, freeze: 1 });
    expect(capsFor(159)).toMatchObject({ hold: 1, freeze: 1 });
    expect(capsFor(160)).toMatchObject({ hold: 1, freeze: 2 });
    expect(capsFor(319)).toMatchObject({ hold: 1, freeze: 2 });
    expect(capsFor(320)).toMatchObject({ hold: 2, freeze: 2 });
    expect(capsFor(100_000)).toMatchObject({ hold: 2, freeze: 2 });
  });

  it('keeps every hold zone inside the bar', () => {
    const stream = new ReelStream(55);
    for (let i = 0; i < 3000; i += 1) {
      const reel = stream.next();
      if (reel.kind !== 'hold') continue;
      expect(reel.zoneCenter - reel.zoneHalf).toBeGreaterThan(0);
      expect(reel.zoneCenter + reel.zoneHalf).toBeLessThan(1000);
    }
  });

  it('mixes in specials at roughly the rate the rules set', () => {
    const stream = new ReelStream(2024);
    let specials = 0;
    const total = 4000;
    for (let i = 0; i < total; i += 1) {
      if (stream.next().kind !== 'skip') specials += 1;
    }
    const share = (specials * 1000) / total;
    expect(share).toBeGreaterThan(330);
    expect(share).toBeLessThan(500);
  });
});
