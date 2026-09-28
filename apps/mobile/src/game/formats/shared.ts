import { useWindowDimensions, type TextStyle, type ViewStyle } from 'react-native';

import { FONT, SPACE, lh } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

/**
 * What the formats share. A format is drawn inside the reel's centre column,
 * between the badge and the caption, and never wider than a phone's photo
 * would be: `useMediaWidth` gives the room it has.
 */

/** The widest a post's picture gets, however wide the phone. */
export const MEDIA_MAX = 318;

/** The centre column's side padding in `ReelCard` (`SPACE.xxl` on each side). */
const COLUMN_PADDING = 26 * 2;

/** How wide a format may draw on this phone. */
export function useMediaWidth(): number {
  const { width } = useWindowDimensions();
  return Math.max(240, Math.min(MEDIA_MAX, width - COLUMN_PADDING));
}

/** A photo, a receipt or a sign never lies quite straight. */
export function tilt(degrees: number): ViewStyle {
  return { transform: [{ rotate: `${degrees}deg` }] };
}

/** A sticker-sized emoji with a hard shadow, like a sticker on a story. */
export function sticker(size: number): TextStyle {
  return {
    fontSize: size,
    lineHeight: Math.round(size * 1.2),
    textShadowColor: REEL.shade,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0.1,
  };
}

/** Rubik Black at any size, on the outline's hard shadow — a post's big words. */
export function shout(size: number): TextStyle {
  return {
    fontFamily: FONT.display,
    fontSize: size,
    lineHeight: lh(Math.round(size * 1.15)),
    color: REEL.ink,
    textShadowColor: REEL.outline,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0.1,
  };
}

/** The glass card most screen-like formats sit on. */
export const CARD: ViewStyle = {
  alignSelf: 'stretch',
  backgroundColor: REEL.shade,
  borderRadius: 20,
  gap: SPACE.sm,
  padding: SPACE.md,
};
