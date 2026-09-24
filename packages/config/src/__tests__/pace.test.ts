import { describe, expect, it } from 'vitest';

import { PACE, countdownMs, exitDelayMs } from '../pace';

describe('pace', () => {
  it('counts down 3-2-1 before the first reel', () => {
    expect(countdownMs()).toBe(1800);
  });

  it('moves straight on after a swiped ordinary reel', () => {
    expect(exitDelayMs(true, 'skip')).toBe(0);
  });

  it('lets a special hit and a miss sink in before the slide', () => {
    expect(exitDelayMs(true, 'like')).toBe(PACE.exitMs.hit);
    expect(exitDelayMs(true, 'hold')).toBe(160);
    expect(exitDelayMs(false, 'skip')).toBe(260);
    expect(exitDelayMs(false, 'freeze')).toBe(PACE.exitMs.miss);
  });
});
