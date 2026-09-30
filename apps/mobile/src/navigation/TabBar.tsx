import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { SHRINK_TO_FIT } from '@/i18n/native';
import { Icon } from '@/ui/icons';
import { buttonColors } from '@/ui/kit/buttons';
import { Slab } from '@/ui/kit/slab';
import { Count } from '@/ui/kit/social';
import { Shine } from '@/ui/kit/surfaces';
import { SPRING, SPRING_POP } from '@/ui/motion';
import { DEPTH, FONT, RADIUS, SPACE, embossed, lh, useTheme, withAlpha } from '@/ui/theme';

/**
 * Room under the dock's labels. An iPhone's home indicator sits low in its
 * inset, so the labels may dip a little into it; Android's gesture line or
 * buttons fill theirs, so the labels stay clear of all of it and a gap more.
 */
export function dockBottom(inset: number, os: typeof Platform.OS = Platform.OS): number {
  return os === 'android' ? inset + SPACE.md : Math.max(inset - 6, SPACE.sm);
}

/** The lobby: the dock's middle slot, drawn as the game's play slab. */
const CENTRE = 'Home';

/**
 * The dock — a game's bottom bar, not an app's tab bar. Five slots on a dark
 * slab with a rounded top; the middle one is the lobby, a gold play slab
 * standing up out of the dock the way every game puts its "play" in the
 * thumb's reach. The slot you are on lifts into a magenta tile and says its
 * name in Rubik; the others wait, dimmed. A slot with news on it
 * (`tabBarBadge`) wears a red count on its corner.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.dock,
        {
          backgroundColor: theme.rail,
          borderColor: theme.outline,
          paddingBottom: dockBottom(insets.bottom),
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.rim, { backgroundColor: withAlpha(theme.onBrand, 0.1) }]}
      />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key] ?? {};
        const focused = state.index === index;
        const label = options?.title ?? route.name;
        const go = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (route.name === CENTRE) {
          return <Centre key={route.key} label={label} focused={focused} onPress={go} />;
        }

        return (
          <Slot
            key={route.key}
            label={label}
            focused={focused}
            icon={options?.tabBarIcon}
            badge={typeof options?.tabBarBadge === 'number' ? options.tabBarBadge : 0}
            onPress={go}
          />
        );
      })}
    </View>
  );
}

function Centre({
  label,
  focused,
  onPress,
}: {
  label: string;
  focused: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const colors = buttonColors(theme, 'play');
  const lift = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    lift.value = withSpring(focused ? 1 : 0, SPRING_POP);
  }, [focused, lift]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.value * 4 }, { scale: 1 + lift.value * 0.06 }],
  }));

  return (
    <View style={styles.slot}>
      <Animated.View style={[styles.orb, orbStyle]}>
        <Slab
          colors={colors}
          radius={20}
          onPress={onPress}
          accessibilityRole="tab"
          accessibilityLabel={label}
          accessibilityState={{ selected: focused }}
          faceStyle={styles.orbFace}
        >
          <Icon name="play" size={30} color={colors.ink} strokeWidth={2.6} fill={colors.ink} />
        </Slab>
      </Animated.View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit={SHRINK_TO_FIT}
        minimumFontScale={0.8}
        style={[styles.label, { color: focused ? theme.gold : theme.inkFaint }, embossed(1.5)]}
      >
        {label}
      </Text>
    </View>
  );
}

function Slot({
  label,
  focused,
  icon,
  badge,
  onPress,
}: {
  label: string;
  focused: boolean;
  icon?: BottomTabBarProps['descriptors'][string]['options']['tabBarIcon'];
  /** News waiting behind the slot; hidden at 0. */
  badge: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const active = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    active.value = focused
      ? withSpring(1, SPRING)
      : withTiming(0, { duration: 160 });
  }, [focused, active]);

  const tileStyle = useAnimatedStyle(() => ({
    opacity: active.value,
    transform: [{ scale: 0.7 + active.value * 0.3 }],
  }));
  const glyphStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -active.value * 3 }, { scale: 1 + active.value * 0.08 }],
  }));

  const color = focused ? theme.onBrand : theme.inkFaint;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={badge > 0 ? t.kit.iconButton.badge(label, badge) : label}
      onPress={onPress}
      style={styles.slot}
    >
      <Animated.View style={[styles.glyph, glyphStyle]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tile,
            {
              backgroundColor: theme.primary,
              borderBottomColor: theme.primaryLip,
              borderColor: theme.outline,
            },
            tileStyle,
          ]}
        >
          <Shine color={theme.primaryHi} radius={14} height="50%" />
        </Animated.View>
        {icon?.({ focused, color, size: 23 })}
        {badge > 0 ? (
          <View pointerEvents="none" style={styles.badge}>
            <Count value={badge} />
          </View>
        ) : null}
      </Animated.View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit={SHRINK_TO_FIT}
        minimumFontScale={0.8}
        style={[styles.label, { color: focused ? theme.ink : theme.inkFaint }, focused ? embossed(1.5) : null]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const TILE = 44;

const styles = StyleSheet.create({
  dock: {
    borderTopLeftRadius: RADIUS.overlay,
    borderTopRightRadius: RADIUS.overlay,
    borderWidth: DEPTH.outline + 0.5,
    borderBottomWidth: 0,
    flexDirection: 'row',
    paddingHorizontal: SPACE.xs,
    paddingTop: SPACE.sm,
  },
  rim: {
    borderRadius: RADIUS.pill,
    height: 2,
    left: RADIUS.overlay,
    position: 'absolute',
    right: RADIUS.overlay,
    top: 3,
  },
  slot: { alignItems: 'center', flex: 1, gap: 3, justifyContent: 'flex-end' },
  glyph: {
    alignItems: 'center',
    height: TILE,
    justifyContent: 'center',
    width: TILE + 8,
  },
  tile: {
    borderBottomWidth: DEPTH.outline + 3,
    borderRadius: 14,
    borderWidth: DEPTH.outline,
    height: TILE,
    left: 4,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    width: TILE,
  },
  badge: { end: -2, position: 'absolute', top: -4 },
  orb: { marginTop: -34 },
  orbFace: { height: 58, width: 64 },
  // A slot's word shrinks a little rather than cut off where a language runs long.
  label: { fontFamily: FONT.displayBold, fontSize: 11.5, lineHeight: lh(14) },
});
