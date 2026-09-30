import type { LeagueTier } from '@quezby/types';
import { render, screen } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { CANVAS, FRAMES } from '@/ui/kit/emblemArt';
import { FramedAvatar, LeagueFrame, metalOf } from '@/ui/kit';
import { emblem } from '@/ui/tokens';

/**
 * Every point a path passes through, its curves' handles included — a box a
 * little looser than the drawing, never tighter.
 */
function extent(d: string) {
  const tokens = d.match(/[MLCHVAZmlchvaz]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const see = (px: number, py: number) => {
    box.minX = Math.min(box.minX, px);
    box.maxX = Math.max(box.maxX, px);
    box.minY = Math.min(box.minY, py);
    box.maxY = Math.max(box.maxY, py);
  };
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i] ?? '')) cmd = tokens[i++] ?? '';
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case 'M':
      case 'L': {
        const a = num();
        const b = num();
        x = rel ? x + a : a;
        y = rel ? y + b : b;
        if (cmd.toUpperCase() === 'M') {
          startX = x;
          startY = y;
          cmd = rel ? 'l' : 'L';
        }
        see(x, y);
        break;
      }
      case 'H':
        x = rel ? x + num() : num();
        see(x, y);
        break;
      case 'V':
        y = rel ? y + num() : num();
        see(x, y);
        break;
      case 'C':
        for (let k = 0; k < 3; k += 1) {
          const a = num();
          const b = num();
          const px = rel ? x + a : a;
          const py = rel ? y + b : b;
          see(px, py);
          if (k === 2) {
            x = px;
            y = py;
          }
        }
        break;
      case 'A': {
        const r = num();
        num();
        num();
        num();
        num();
        const a = num();
        const b = num();
        const nx = rel ? x + a : a;
        const ny = rel ? y + b : b;
        see((x + nx) / 2 - r, (y + ny) / 2 - r);
        see((x + nx) / 2 + r, (y + ny) / 2 + r);
        x = nx;
        y = ny;
        break;
      }
      case 'Z':
        x = startX;
        y = startY;
        break;
      default:
        i += 1;
    }
  }
  return box;
}


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

  it('stay inside their canvas, two units in, so a frame fits the box it is given', () => {
    for (const tier of TIERS) {
      const frame = FRAMES[tier];
      for (const shape of [...frame.back, ...frame.front]) {
        const box = extent(shape.d);
        const edge = (shape.outline ?? shape.strokeWidth ?? 0) / 2;
        expect(box.minX - edge).toBeGreaterThanOrEqual(2);
        expect(box.minY - edge).toBeGreaterThanOrEqual(2);
        expect(box.maxX + edge).toBeLessThanOrEqual(CANVAS - 2);
        expect(box.maxY + edge).toBeLessThanOrEqual(CANVAS - 2);
      }
      for (const [x, y, size] of frame.sparkles) {
        expect(Math.min(x - size, y - size)).toBeGreaterThanOrEqual(2);
        expect(Math.max(x + size, y + size)).toBeLessThanOrEqual(CANVAS - 2);
      }
    }
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
