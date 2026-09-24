import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { toneColor, type Tone } from '@/ui/kit/tones';
import { Icon, type IconName } from '@/ui/icons';
import {
  EMBOSSED,
  RADIUS,
  SPACE,
  TYPE,
  embossed,
  useTheme,
  withAlpha,
  type TypeRole,
} from '@/ui/theme';

/**
 * Every string in the app. One component with a role and a tone, rather than a
 * Title / Body / Caption family that drifts apart a screen at a time. The
 * Rubik roles — hero, display, title, score — stand on a hard shadow, the way
 * a game sets its titles; `flat` takes it away for text on a light face.
 */
export function Txt({
  variant = 'body',
  tone = 'ink',
  align,
  numberOfLines,
  flat = false,
  style,
  children,
}: {
  variant?: TypeRole;
  tone?: Tone;
  align?: TextStyle['textAlign'];
  numberOfLines?: number;
  /** No shadow under a display line. */
  flat?: boolean;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
}) {
  const theme = useTheme();
  const lift = EMBOSSED.has(variant) && !flat;
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        TYPE[variant],
        { color: toneColor(theme, tone) },
        lift ? embossed(variant === 'hero' || variant === 'score' ? 3 : 2) : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/**
 * A section's name over a group — Rubik, with a glyph before it and a groove
 * running out to the edge after it, the way a game heads a list.
 */
export function Eyebrow({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: IconName;
}) {
  const theme = useTheme();
  return (
    <View style={styles.eyebrow}>
      {icon ? (
        <Icon name={icon} size={15} color={theme.gold} strokeWidth={2.6} />
      ) : null}
      <Text style={[TYPE.title, styles.eyebrowText, { color: theme.ink }, embossed(2)]}>
        {children}
      </Text>
      <View style={[styles.groove, { backgroundColor: withAlpha(theme.onBrand, 0.12) }]} />
    </View>
  );
}

/**
 * A ribbon: a tile's or a card's name on a dark strip — "GÜNÜN AKIŞI",
 * "LİG". Type it in capitals yourself, with the Turkish İ.
 */
export function Ribbon({
  label,
  tone = 'gold',
  style,
}: {
  label: string;
  tone?: 'gold' | 'ink' | 'accent';
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const color =
    tone === 'gold' ? theme.gold : tone === 'accent' ? theme.accent : theme.inkMuted;
  return (
    <View
      style={[
        styles.ribbon,
        { backgroundColor: theme.outline, borderColor: withAlpha(color, 0.35) },
        style,
      ]}
    >
      <Text style={[TYPE.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACE.sm,
    marginTop: SPACE.xs,
  },
  eyebrowText: { fontSize: 17, lineHeight: 22 },
  groove: { borderRadius: RADIUS.pill, flex: 1, height: 2 },
  ribbon: {
    alignSelf: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: SPACE.lg,
    paddingVertical: 4,
  },
});
