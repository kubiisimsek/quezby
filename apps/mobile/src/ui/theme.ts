import type { TextStyle, ViewStyle } from 'react-native';

import { IS_RTL } from '@/i18n/native';
import { startedScript, type Script } from '@/i18n/script';
import { arena, type Palette } from '@/ui/tokens';

/**
 * Quezby "Arena" — the game's one look: a violet night lit magenta from the
 * top, chunky tiles with a dark outline and a lip under them, gold for the
 * action that starts a game. The palette is generated from
 * `design/palette.mjs`.
 *
 * `dark` stays on the type so code that asks keeps working; it is always
 * true. A game has an art direction, not a system theme.
 */
export type Theme = Palette & { dark: true };

const ARENA: Theme = { ...arena, dark: true };

export function useTheme(): Theme {
  return ARENA;
}

/** The arena outside a component — the app root, a navigation theme. */
export const THEME = ARENA;

/**
 * A role at an opacity — a translucent well on a band or a tile.
 * Takes a generated `#rrggbb` or `#rrggbbaa`; an alpha already there is
 * multiplied, not replaced.
 */
export function withAlpha(color: string, opacity: number): string {
  const base = color.slice(0, 7);
  const own = color.length === 9 ? parseInt(color.slice(7, 9), 16) / 255 : 1;
  const alpha = Math.round(Math.min(1, Math.max(0, opacity)) * own * 255);
  return `${base}${alpha.toString(16).padStart(2, '0')}`;
}

/**
 * Rubik Black for what a player reads at a glance — titles, numbers, buttons
 * — and Nunito for everything they read. Both carry every letter Turkish,
 * German, French and Spanish write (ğ ş ı İ ç ö ü ä ß é è ê à ñ á í ó ú œ);
 * most display faces games use (Lilita One, Fredoka, Luckiest Guy) do not,
 * or draw a lower-case i without its dot.
 */
export const LATIN_FONT = {
  /** Rubik Black: titles, scores, button labels. */
  display: 'Rubik-Black',
  /** Rubik ExtraBold: a smaller display line, a tab label. */
  displayBold: 'Rubik-ExtraBold',
  regular: 'Nunito-SemiBold',
  medium: 'Nunito-Bold',
  semibold: 'Nunito-ExtraBold',
  bold: 'Nunito-Black',
} as const;

/**
 * Neither face has a single Arabic letter: Arabic is set in Cairo, weight
 * for weight — Black where Rubik Black stands, down to SemiBold for body text.
 */
export const ARABIC_FONT: Record<keyof typeof LATIN_FONT, string> = {
  display: 'Cairo-Black',
  displayBold: 'Cairo-ExtraBold',
  regular: 'Cairo-SemiBold',
  medium: 'Cairo-Bold',
  semibold: 'Cairo-ExtraBold',
  bold: 'Cairo-Black',
};

/**
 * Japanese in M PLUS Rounded 1c, rounded like Nunito: Black where Rubik Black
 * stands, down to Medium for reading. The files carry only the characters the
 * game says (`pnpm fonts:cjk`).
 */
export const JAPANESE_FONT: Record<keyof typeof LATIN_FONT, string> = {
  display: 'RoundedMplus1c-Black',
  displayBold: 'RoundedMplus1c-ExtraBold',
  regular: 'RoundedMplus1c-Medium',
  medium: 'RoundedMplus1c-Bold',
  semibold: 'RoundedMplus1c-ExtraBold',
  bold: 'RoundedMplus1c-Black',
};

/**
 * Korean in Jua for what is read at a glance — one heavy, round weight — and
 * Gothic A1 for reading, SemiBold to Black (`pnpm fonts:cjk`).
 */
export const KOREAN_FONT: Record<keyof typeof LATIN_FONT, string> = {
  display: 'Jua-Regular',
  displayBold: 'Jua-Regular',
  regular: 'GothicA1-SemiBold',
  medium: 'GothicA1-Bold',
  semibold: 'GothicA1-ExtraBold',
  bold: 'GothicA1-Black',
};

export const FACES: Record<Script, Record<keyof typeof LATIN_FONT, string>> = {
  latin: LATIN_FONT,
  arabic: ARABIC_FONT,
  japanese: JAPANESE_FONT,
  korean: KOREAN_FONT,
};

/**
 * The script this launch is set in: Arabic when the app reads right to left —
 * turning around reloads it — else the one of the language it started in
 * (`startIn`). Every style sheet is built with its faces.
 */
export const SCRIPT: Script = IS_RTL ? 'arabic' : startedScript() === 'arabic' ? 'latin' : startedScript();

/** The faces the game speaks in, for this launch. */
export const FONT: Record<keyof typeof LATIN_FONT, string> = FACES[SCRIPT];

/**
 * How much taller than a Latin line a line of each script is set. Arabic's
 * letters climb and hang further (Cairo's ascender and descender are half
 * again Rubik's); Japanese and Korean glyphs fill their square to the edges.
 */
const LINE: Record<Script, number> = { latin: 1, arabic: 1.3, japanese: 1.15, korean: 1.1 };

/** A line height for the language on screen: more room where the letters need it, or tops and tails are cut off. */
export function lh(height: number): number {
  return Math.round(height * LINE[SCRIPT]);
}

/**
 * Letter-spacing for the language on screen: none in Arabic, whose letters
 * join one another — any spacing tears the words apart.
 */
export function tracking(spacing: number): number {
  return IS_RTL ? 0 : spacing;
}

/** 4pt grid, with the half steps a dense layout needs. */
export const SPACE = {
  xxs: 2,
  xs: 4,
  sm: 6,
  ms: 10,
  md: 12,
  lg: 14,
  xl: 18,
  xxl: 26,
} as const;

/** Chunky and round: a game's corners. */
export const RADIUS = {
  control: 16,
  nav: 18,
  panel: 22,
  overlay: 30,
  pill: 999,
} as const;

/**
 * Depth, the arena way: an outline around every tile and button, and a lip
 * under it — the slab's side, drawn as a thicker bottom edge. A button's lip
 * is what it sinks into when pressed.
 */
export const DEPTH = {
  outline: 2.5,
  lip: 6,
  lipSm: 4,
} as const;

export type TypeRole =
  | 'hero'
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'meta'
  | 'micro'
  | 'score'
  | 'label';

export const TYPE: Record<TypeRole, TextStyle> = {
  /** A first page's one big line. */
  hero: { fontFamily: FONT.display, fontSize: 42, lineHeight: lh(48) },
  display: { fontFamily: FONT.display, fontSize: 28, lineHeight: lh(33) },
  title: { fontFamily: FONT.display, fontSize: 20, lineHeight: lh(25) },
  heading: { fontFamily: FONT.semibold, fontSize: 16, lineHeight: lh(21) },
  body: { fontFamily: FONT.medium, fontSize: 15, lineHeight: lh(20) },
  meta: { fontFamily: FONT.medium, fontSize: 13, lineHeight: lh(17) },
  micro: { fontFamily: FONT.semibold, fontSize: 11.5, lineHeight: lh(14) },
  /** A score is the one number a player opens the app to read. */
  score: { fontFamily: FONT.display, fontSize: 40, lineHeight: lh(46) },
  /**
   * A ribbon or a tile's name — "GÜNÜN AKIŞI", "LİG". Typed in capitals in
   * each language's own line (the Turkish İ, German SS), never through
   * `textTransform`, which knows no Turkish.
   */
  label: {
    fontFamily: FONT.displayBold,
    fontSize: 12.5,
    letterSpacing: tracking(1.1),
    lineHeight: lh(16),
  },
};

/** The roles set in Rubik, which stand on a hard shadow like a game's titles. */
export const EMBOSSED: ReadonlySet<TypeRole> = new Set([
  'hero',
  'display',
  'title',
  'score',
]);

/**
 * The hard drop shadow under display text: the outline colour, straight
 * down, no blur — letters that stand on the tile instead of being printed on
 * it.
 */
export function embossed(size = 2): TextStyle {
  return {
    textShadowColor: ARENA.outline,
    textShadowOffset: { width: 0, height: size },
    textShadowRadius: 0.1,
  };
}

/** Control heights. One place, so a field and the button under it agree. */
export const CONTROL = {
  sm: 36,
  md: 46,
  lg: 58,
} as const;

/**
 * Elevation for what floats over the arena — a sheet, the dock. Tiles and
 * buttons stand on their lip instead (see `DEPTH`).
 */
export type Elevation = 'flat' | 'card' | 'raised' | 'overlay';

export function shadow(theme: Theme, level: Elevation): ViewStyle {
  if (level === 'flat') return {};
  const spec = {
    card: { radius: 10, y: 4, opacity: 0.28, elevation: 3 },
    raised: { radius: 18, y: 8, opacity: 0.34, elevation: 6 },
    overlay: { radius: 30, y: -6, opacity: 0.5, elevation: 18 },
  }[level];
  return {
    shadowColor: theme.outline,
    shadowOffset: { width: 0, height: spec.y },
    shadowOpacity: spec.opacity,
    shadowRadius: spec.radius,
    elevation: spec.elevation,
  };
}
