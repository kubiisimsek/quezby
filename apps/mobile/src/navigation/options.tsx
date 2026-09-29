import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { Theme as NavTheme } from '@react-navigation/native';

import { Icon, type IconName } from '@/ui/icons';
import { FONT, useTheme, withAlpha } from '@/ui/theme';

/**
 * Every stack screen draws its own head on the arena (`TopBar`); a game has
 * no navigation bar. The content behind a transition is the night, never
 * white.
 */
export function useStackOptions(): NativeStackNavigationOptions {
  const theme = useTheme();
  return {
    headerShown: false,
    contentStyle: { backgroundColor: theme.canvas },
  };
}

/** One slot of the dock, described once: its label and its glyph. */
export function tab(title: string, icon: IconName): BottomTabNavigationOptions {
  return {
    title,
    tabBarIcon: ({ color, focused }) => (
      <Icon
        name={icon}
        color={color}
        size={23}
        strokeWidth={2.5}
        fill={focused && FILLED.has(icon) ? withAlpha(color, 0.3) : undefined}
      />
    ),
  };
}

/** Glyphs with a closed body, washed in their colour when their slot is on. */
const FILLED: ReadonlySet<IconName> = new Set(['shield', 'account', 'users', 'mountain', 'podium', 'message']);

export function useNavTheme(): NavTheme {
  const theme = useTheme();
  return {
    dark: theme.dark,
    colors: {
      primary: theme.primary,
      background: theme.canvas,
      card: theme.rail,
      text: theme.ink,
      border: theme.line,
      notification: theme.bad,
    },
    fonts: {
      regular: { fontFamily: FONT.regular, fontWeight: '400' },
      medium: { fontFamily: FONT.medium, fontWeight: '500' },
      bold: { fontFamily: FONT.semibold, fontWeight: '600' },
      heavy: { fontFamily: FONT.bold, fontWeight: '700' },
    },
  };
}
