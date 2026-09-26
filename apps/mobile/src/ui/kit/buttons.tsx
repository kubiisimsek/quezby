import type { SocialProvider } from '@quezby/types';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useT } from '@/i18n';
import { SHRINK_TO_FIT } from '@/i18n/native';
import { GoogleMark } from '@/ui/brand-mark';
import { AnimatedPressable } from '@/ui/kit/shared';
import { Slab, type SlabColors } from '@/ui/kit/slab';
import { Icon, type IconName } from '@/ui/icons';
import { usePressScale } from '@/ui/motion';
import {
  CONTROL,
  DEPTH,
  FONT,
  RADIUS,
  SPACE,
  TYPE,
  embossed,
  lh,
  useTheme,
  type Theme,
} from '@/ui/theme';

export type ButtonTone =
  /** Magenta: the actions around a game — "Geç onu", "Paylaş". */
  | 'primary'
  /** Violet: the quieter choice beside it. */
  | 'secondary'
  /** A tile-coloured slab: a door that is not an action. */
  | 'neutral'
  /** No slab at all — "Ana sayfaya dön". */
  | 'ghost'
  /** Red: the one that takes something away. */
  | 'danger'
  /** Gold: the action that starts a game. One per screen. */
  | 'play'
  /** Gold on a band: the band's one solid action. */
  | 'onBrand'
  /** Violet on a band: the quieter one beside it. */
  | 'onBrandSoft';

type Size = 'sm' | 'md' | 'lg' | 'xl';

/** The slab and the ink of every tone that has one. */
export function buttonColors(
  theme: Theme,
  tone: Exclude<ButtonTone, 'ghost'>,
): SlabColors & { ink: string; embossed: boolean } {
  switch (tone) {
    case 'play':
    case 'onBrand':
      return {
        hi: theme.goldHi,
        face: theme.gold,
        lip: theme.goldLip,
        ink: theme.goldInk,
        embossed: false,
      };
    case 'secondary':
    case 'onBrandSoft':
      return {
        hi: theme.secondaryHi,
        face: theme.secondary,
        lip: theme.secondaryLip,
        ink: theme.onBrand,
        embossed: true,
      };
    case 'neutral':
      return {
        hi: theme.tileHi,
        face: theme.tile,
        lip: theme.tileLip,
        ink: theme.ink,
        embossed: true,
      };
    case 'danger':
      return {
        hi: theme.badHi,
        face: theme.bad,
        lip: theme.badLip,
        ink: theme.onBrand,
        embossed: true,
      };
    default:
      return {
        hi: theme.primaryHi,
        face: theme.primary,
        lip: theme.primaryLip,
        ink: theme.onBrand,
        embossed: true,
      };
  }
}

const LABEL: Record<Size, { fontSize: number; lineHeight: number }> = {
  sm: { fontSize: 14, lineHeight: lh(18) },
  md: { fontSize: 17, lineHeight: lh(21) },
  lg: { fontSize: 20, lineHeight: lh(24) },
  xl: { fontSize: 28, lineHeight: lh(33) },
};

const GLYPH: Record<Size, number> = { sm: 15, md: 18, lg: 21, xl: 28 };

const HEIGHT: Record<Size, number> = {
  sm: CONTROL.sm,
  md: CONTROL.md,
  lg: CONTROL.lg,
  xl: 74,
};

/**
 * A button, as the game draws one: a slab that sinks into its lip under the
 * thumb, its label in Rubik Black. Gold starts a game; magenta and violet do
 * everything around one; red takes something away.
 */
export function Button({
  label,
  onPress,
  tone = 'primary',
  size = 'lg',
  disabled,
  loading,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: ButtonTone;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const press = usePressScale(0.96);
  const inactive = Boolean(disabled || loading);

  if (tone === 'ghost') {
    return (
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityState={{ disabled: inactive }}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        disabled={inactive}
        style={[
          styles.ghost,
          { minHeight: HEIGHT[size], opacity: inactive ? 0.5 : 1 },
          press.style,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={theme.inkMuted} size="small" />
        ) : (
          <>
            {icon ? (
              <Icon name={icon} size={GLYPH[size] - 2} color={theme.inkMuted} strokeWidth={2.4} />
            ) : null}
            <Text style={[TYPE.heading, { color: theme.inkMuted }]}>{label}</Text>
          </>
        )}
      </AnimatedPressable>
    );
  }

  const colors = buttonColors(theme, tone);
  const lip = size === 'sm' ? DEPTH.lipSm : DEPTH.lip;

  return (
    <Slab
      colors={colors}
      radius={size === 'xl' ? RADIUS.panel : RADIUS.control}
      lip={lip}
      onPress={onPress}
      disabled={inactive}
      accessibilityLabel={label}
      accessibilityState={{ busy: Boolean(loading) }}
      style={[{ opacity: disabled && !loading ? 0.5 : 1 }, style]}
      faceStyle={[
        styles.face,
        {
          gap: size === 'xl' ? SPACE.md : SPACE.sm,
          minHeight: HEIGHT[size],
          paddingHorizontal: size === 'sm' ? SPACE.md : SPACE.xl,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.ink} size="small" />
      ) : (
        <>
          {icon ? (
            <Icon
              name={icon}
              size={GLYPH[size]}
              color={colors.ink}
              strokeWidth={2.6}
              fill={icon === 'play' ? colors.ink : undefined}
            />
          ) : null}
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit={SHRINK_TO_FIT}
            minimumFontScale={0.72}
            style={[
              styles.label,
              LABEL[size],
              { color: colors.ink },
              colors.embossed ? embossed(size === 'sm' ? 1.5 : 2) : null,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Slab>
  );
}

/**
 * A glyph-only action: a small square slab. `onBrand` on a brand band,
 * `neutral` on the arena. The label is never shown; it is what a screen
 * reader says.
 */
export function IconButton({
  icon,
  label,
  onPress,
  tone = 'neutral',
  badge = 0,
  style,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'onBrand' | 'neutral';
  /** A count on the corner. Hidden at 0, `9+` past nine. */
  badge?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const t = useT();
  const colors = buttonColors(theme, tone === 'onBrand' ? 'secondary' : 'neutral');

  return (
    <View style={style}>
      <Slab
        colors={colors}
        radius={RADIUS.control - 2}
        lip={DEPTH.lipSm}
        onPress={onPress}
        hitSlop={8}
        accessibilityLabel={badge > 0 ? t.kit.iconButton.badge(label, badge) : label}
        faceStyle={styles.square}
      >
        <Icon name={icon} size={21} color={theme.ink} strokeWidth={2.6} />
      </Slab>
      {badge > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.badge,
            { backgroundColor: theme.bad, borderColor: theme.outline },
          ]}
        >
          <Text style={[styles.badgeText, { color: theme.onBrand }]}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Sign in with Apple or Google, drawn the way each company asks on a dark
 * screen: Apple's white button with its logo, Google's dark surface with the
 * four-colour G. Flat on purpose — neither company allows effects on its
 * button — but the height and corners of a large `Button`, so the doors
 * stack without a seam.
 */
export function SocialButton({
  provider,
  onPress,
  loading,
  disabled,
  label,
  style,
}: {
  provider: SocialProvider;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** "Apple ile devam et" / "Google ile devam et", in the player's language, unless given. */
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const t = useT();
  const press = usePressScale(0.96);
  const apple = provider === 'apple';
  const colors = apple
    ? { bg: theme.appleBg, fg: theme.appleInk, border: theme.appleBg }
    : { bg: theme.googleBg, fg: theme.googleInk, border: theme.googleLine };
  const text = label ?? t.kit.socialButton[provider];
  const inactive = Boolean(disabled || loading);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{ disabled: inactive, busy: Boolean(loading) }}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={inactive}
      style={[
        styles.social,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          opacity: inactive ? 0.45 : 1,
        },
        press.style,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.fg} size="small" />
      ) : (
        <>
          {apple ? (
            <Icon name="apple" size={19} color={colors.fg} />
          ) : (
            <GoogleMark size={18} />
          )}
          <Text style={[TYPE.heading, { color: colors.fg }]}>{text}</Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  face: { flexDirection: 'row' },
  label: { flexShrink: 1, fontFamily: FONT.display, textAlign: 'center' },
  ghost: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACE.sm,
    justifyContent: 'center',
    paddingHorizontal: SPACE.lg,
  },
  social: {
    alignItems: 'center',
    borderRadius: RADIUS.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACE.sm,
    justifyContent: 'center',
    minHeight: CONTROL.lg,
    paddingHorizontal: SPACE.xl,
  },
  square: { height: 42, width: 42 },
  badge: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -6,
    top: -6,
  },
  badgeText: { fontFamily: FONT.display, fontSize: 10.5, lineHeight: lh(13) },
});
