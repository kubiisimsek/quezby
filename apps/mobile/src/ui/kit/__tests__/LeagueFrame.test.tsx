import type { LeagueTier } from '@quezby/types';
import { render, screen } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { CANVAS, FRAMES } from '@/ui/kit/emblemArt';
import { FramedAvatar, LeagueFrame, metalOf } from '@/ui/kit';
import { emblem } from '@/ui/tokens';

const TIERS: LeagueTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master'];
const hidden = { includeHiddenElements: true };

describe('LeagueFrame', () => {
  beforeEach(() => {
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  it.each(TIERS)('draws the %s frame, read aloud only when it is named', async (tier) => {
    await render(<LeagueFrame tier={tier} size={96} label="Lig" />);
    expect(screen.getByRole('image', { name: 'Lig' })).toBeOnTheScreen();
    expect(screen.getByTestId(`league-frame-${tier}`)).toBeOnTheScreen();

    await screen.rerender(<LeagueFrame tier={tier} size={96} />);
    expect(screen.queryByRole('image')).toBeNull();
    expect(screen.getByTestId(`league-frame-${tier}`, hidden)).toBeTruthy();
  });

  it('comes alive, and stands still for a phone that reduces motion', async () => {
    await render(<LeagueFrame tier="master" size={120} animated />);
    expect(screen.getByTestId('league-frame-master', hidden)).toBeTruthy();

    jest.mocked(useReducedMotion).mockReturnValue(true);
    await screen.rerender(<LeagueFrame tier="master" size={120} animated />);
    expect(screen.getByTestId('league-frame-master', hidden)).toBeTruthy();
  });

  it('takes each league’s metal from the palette', () => {
    expect(metalOf('gold')).toEqual({
      hi: emblem.goldHi,
      rim: emblem.goldRim,
      face: emblem.goldFace,
      shade: emblem.goldShade,
      deep: emblem.goldDeep,
      accent: emblem.goldAccent,
      gem: emblem.goldGem,
      gemHi: emblem.goldGemHi,
      glow: emblem.goldGlow,
    });
  });
});

describe('FramedAvatar', () => {
  it('puts the player’s initials in their league’s frame', async () => {
    await render(<FramedAvatar tier="diamond" name="kubi" size={100} />);

    expect(screen.getByTestId('league-frame-diamond', hidden)).toBeTruthy();
    expect(screen.getByText('KU', hidden)).toBeTruthy();
  });

  it('draws a player with no league yet without a frame', async () => {
    await render(<FramedAvatar tier={null} name="kubi" size={100} />);

    expect(screen.queryByTestId(/^league-frame-/, hidden)).toBeNull();
    expect(screen.getByText('KU', hidden)).toBeTruthy();
  });
});

describe('the frames', () => {
  it('grow with the league: never fewer ornaments than the league under', () => {
    const count = (tier: LeagueTier) => FRAMES[tier].back.length + FRAMES[tier].front.length;
    for (let i = 1; i < TIERS.length; i += 1) {
      expect(count(TIERS[i]!)).toBeGreaterThanOrEqual(count(TIERS[i - 1]!));
    }
    expect(FRAMES.bronze.back).toHaveLength(0);
    expect(FRAMES.master.back.some((shape) => shape.spin)).toBe(true);
    expect(TIERS.filter((tier) => FRAMES[tier].glow)).toEqual(['platinum', 'diamond', 'master']);
  });

  it('give every league its own mark', () => {
    const marks = new Set(TIERS.map((tier) => FRAMES[tier].mark.map((shape) => shape.d).join('')));
    expect(marks.size).toBe(TIERS.length);
  });

  it('keep their wings mirrored across the middle', () => {
    const subpaths = FRAMES.diamond.back[0]!.d.split('M').filter(Boolean);
    const half = subpaths.length / 2;
    const numbers = (path: string) => [...path.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
    expect(half).toBe(5);
    for (let i = 0; i < half; i += 1) {
      const left = numbers(subpaths[i]!);
      const right = numbers(subpaths[i + half]!);
      expect(right).toHaveLength(left.length);
      left.forEach((value, k) => {
        const expected = k % 2 === 0 ? CANVAS - value : value;
        expect(Math.abs(right[k]! - expected)).toBeLessThan(0.11);
      });
    }
  });
});
