import { Image, StyleSheet, Text, View } from 'react-native';

import { initialsOf } from '@/lib/format';
import { type TagTone } from '@/ui/kit/tones';
import { Icon, type IconName } from '@/ui/icons';
import { DEPTH, FONT, embossed, useTheme, withAlpha, type Theme } from '@/ui/theme';

/** The bright colour of a tone, and the ink that sits on it. */
export function gemColors(
  theme: Theme,
  tone: TagTone,
): { solid: string; deep: string; ink: string } {
  switch (tone) {
    case 'primary':
      return { solid: theme.primary, deep: theme.primaryLip, ink: theme.onBrand };
    case 'secondary':
      return { solid: theme.secondary, deep: theme.secondaryLip, ink: theme.onBrand };
    case 'ok':
      return { solid: theme.ok, deep: theme.okLip, ink: theme.outline };
    case 'warn':
      return { solid: theme.gold, deep: theme.goldLip, ink: theme.goldInk };
    case 'bad':
      return { solid: theme.bad, deep: theme.badLip, ink: theme.onBrand };
    default:
      return { solid: theme.tileHi, deep: theme.tileLip, ink: theme.onBrand };
  }
}

const AVATAR = { sm: 32, md: 40, lg: 54 } as const;

/**
 * A player's portrait: their initials in Rubik on a dark card, set in a frame
 * of their tone — magenta for you, violet for everyone else — the way a game
 * shows who is who. A photo, when there is one, covers the initials; an
 * expired one leaves them showing.
 */
export function Avatar({
  name,
  src,
  tone = 'neutral',
  size = 'md',
}: {
  name: string;
  /** The signed, expiring URL the API hands out, already resolved. */
  src?: string | null;
  tone?: TagTone;
  size?: 'sm' | 'md' | 'lg';
}) {
  const theme = useTheme();
  const colors = gemColors(theme, tone === 'neutral' ? 'secondary' : tone);
  const box = AVATAR[size];
  const radius = Math.round(box * 0.32);
  const frame = size === 'sm' ? 2 : 3;

  return (
    <View
      style={[
        styles.frame,
        {
          backgroundColor: colors.solid,
          borderColor: theme.outline,
          borderRadius: radius,
          height: box,
          padding: frame,
          width: box,
        },
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.deep,
            borderRadius: Math.max(4, radius - frame - 1),
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[styles.shine, { backgroundColor: withAlpha(theme.onBrand, 0.12) }]}
        />
        <Text
          style={[
            styles.initials,
            { color: theme.onBrand, fontSize: Math.round(box * 0.36) },
            embossed(size === 'lg' ? 2 : 1.5),
          ]}
        >
          {initialsOf(name)}
        </Text>
        {src ? (
          <Image
            source={{ uri: src }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : null}
      </View>
    </View>
  );
}

const GEM = {
  sm: { box: 30, glyph: 16 },
  md: { box: 38, glyph: 20 },
  lg: { box: 50, glyph: 26 },
} as const;

/**
 * A gem: one glyph on a bright, outlined tile of its tone with a lit top —
 * the game's unit of colour in a list, a stat, a door.
 */
export function IconChip({
  icon,
  tone = 'primary',
  size = 'md',
}: {
  icon: IconName;
  tone?: TagTone;
  size?: 'sm' | 'md' | 'lg';
}) {
  const theme = useTheme();
  const colors = gemColors(theme, tone);
  const { box, glyph } = GEM[size];
  const radius = Math.round(box * 0.3);

  return (
    <View
      style={[
        styles.gem,
        {
          backgroundColor: colors.solid,
          borderBottomColor: theme.outline,
          borderBottomWidth: DEPTH.outline + 2,
          borderColor: theme.outline,
          borderRadius: radius,
          height: box + 2,
          width: box,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.gemShine,
          {
            backgroundColor: withAlpha(theme.onBrand, 0.28),
            borderRadius: Math.max(3, radius - 4),
          },
        ]}
      />
      <Icon name={icon} size={glyph} color={colors.ink} strokeWidth={2.5} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderWidth: DEPTH.outline },
  card: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shine: { height: '45%', left: 0, position: 'absolute', right: 0, top: 0 },
  initials: { fontFamily: FONT.display, includeFontPadding: false },
  gem: {
    alignItems: 'center',
    borderWidth: DEPTH.outline,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gemShine: { height: '38%', left: 4, position: 'absolute', right: 4, top: 3 },
});
