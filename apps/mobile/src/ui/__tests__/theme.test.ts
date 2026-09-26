import { renderHook } from '@testing-library/react-native';

import { THEME, TYPE, embossed, useTheme, withAlpha } from '@/ui/theme';
import { arena } from '@/ui/tokens';

/** The alpha byte of a generated colour, 0–255. */
function alphaOf(colour: string): number {
  return colour.length === 9 ? parseInt(colour.slice(7), 16) : 255;
}

describe('withAlpha', () => {
  it('keeps the colour and sets its opacity', () => {
    const well = withAlpha(arena.onBrand, 0.14);

    expect(well.slice(0, 7)).toBe(arena.onBrand);
    expect(alphaOf(well)).toBe(Math.round(0.14 * 255));
  });

  it('multiplies an opacity the role already has', () => {
    const half = withAlpha(arena.scrim, 0.5);

    expect(half.slice(0, 7)).toBe(arena.scrim.slice(0, 7));
    expect(alphaOf(half)).toBe(Math.round(0.5 * alphaOf(arena.scrim)));
  });

  it('clamps to fully clear and fully solid', () => {
    expect(alphaOf(withAlpha(arena.ink, -1))).toBe(0);
    expect(alphaOf(withAlpha(arena.ink, 3))).toBe(255);
  });
});

describe('the arena', () => {
  it('is the one look, whatever the phone is set to', async () => {
    const { result } = await renderHook(() => useTheme());

    expect(result.current).toEqual({ ...arena, dark: true });
    expect(THEME).toBe(result.current);
  });

  it('stands display text on a hard shadow in the outline colour', () => {
    expect(embossed(3)).toEqual({
      textShadowColor: arena.outline,
      textShadowOffset: { width: 0, height: 3 },
      textShadowRadius: 0.1,
    });
  });

  it('sets titles and numbers in Rubik and reading text in Nunito', () => {
    expect(TYPE.display.fontFamily).toBe('Rubik-Black');
    expect(TYPE.score.fontFamily).toBe('Rubik-Black');
    expect(TYPE.label.fontFamily).toBe('Rubik-ExtraBold');
    expect(TYPE.body.fontFamily).toMatch(/^Nunito-/);
    expect(TYPE.heading.fontFamily).toMatch(/^Nunito-/);
  });
});

describe('type for the language on screen', () => {
  it('sets Latin languages in Rubik and Nunito, spaced and at their own line heights', () => {
    const theme = jest.requireActual('@/ui/theme') as typeof import('@/ui/theme');
    expect(theme.FONT).toEqual(theme.LATIN_FONT);
    expect(theme.TYPE.label).toMatchObject({ fontFamily: 'Rubik-ExtraBold', letterSpacing: 1.1, lineHeight: 16 });
    expect(theme.lh(20)).toBe(20);
    expect(theme.tracking(1.1)).toBe(1.1);
  });

  it('sets Arabic in Cairo, weight for weight, never spaced, with room for its letters', () => {
    jest.isolateModules(() => {
      jest.doMock('@/i18n/native', () => ({ ...jest.requireActual('@/i18n/native'), IS_RTL: true }));
      const theme = require('@/ui/theme') as typeof import('@/ui/theme');

      expect(theme.FONT).toEqual(theme.ARABIC_FONT);
      expect(theme.FONT.display).toBe('Cairo-Black');
      expect(theme.TYPE.label.letterSpacing).toBe(0);
      expect(theme.TYPE.body.lineHeight).toBe(26);
      expect(theme.tracking(1.1)).toBe(0);
    });
  });
});
