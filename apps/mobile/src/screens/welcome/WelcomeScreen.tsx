import { LOCALE_NAMES } from '@quezby/config';
import { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LanguageSheet } from '@/components/LanguageSheet';
import { REEL_ORDER, reelGuide } from '@/game/howTo';
import { useLocale, useT } from '@/i18n';
import { useOnboarding } from '@/stores/onboarding';
import { BrandMark } from '@/ui/brand-mark';
import { Button, IconChip, Screen, Stamp, Txt } from '@/ui/kit';
import { useEntrance } from '@/ui/motion';
import { LATIN_FONT, SPACE, lh, useTheme } from '@/ui/theme';

/**
 * The first screen: the game's name, its four moves as gems, and one way on
 * — **Oyna**, the practice run that teaches the moves and counts nowhere. No
 * account yet: the ways in come after the run. The game opens in the phone's
 * language; the small language slab at the top changes it before anything
 * is played.
 */
export function WelcomeScreen() {
  const theme = useTheme();
  const t = useT();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const [languages, setLanguages] = useState(false);
  const hero = useEntrance(0, 24);
  const moves = useEntrance(1);
  const actions = useEntrance(2);

  const guide = reelGuide(t);

  return (
    <Screen>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + SPACE.xl, paddingBottom: insets.bottom + SPACE.xl },
        ]}
      >
        <View style={styles.top}>
          <Button
            label={LOCALE_NAMES[locale]}
            icon="globe"
            tone="neutral"
            size="sm"
            onPress={() => setLanguages(true)}
          />
        </View>

        <Animated.View style={[styles.hero, hero]}>
          <Stamp from={0.4}>
            <View style={[styles.mark, { shadowColor: theme.glow }]}>
              <BrandMark size={112} />
            </View>
          </Stamp>
          <Txt variant="hero" align="center" style={styles.name}>
            Quezby
          </Txt>
          <Txt variant="heading" tone="muted" align="center">
            {t.welcome.tagline}
          </Txt>
        </Animated.View>

        <Animated.View style={[styles.moves, moves]}>
          <View style={styles.gems}>
            {REEL_ORDER.map((kind) => {
              const { icon, tone } = guide[kind];
              return (
                <IconChip
                  key={kind}
                  icon={icon}
                  tone={tone === 'neutral' ? 'secondary' : tone}
                  size="lg"
                />
              );
            })}
          </View>
          <Txt variant="meta" tone="muted" align="center">
            {t.welcome.moves}
          </Txt>
        </Animated.View>

        <Animated.View style={[styles.actions, actions]}>
          <Button
            label={t.welcome.play}
            icon="play"
            tone="play"
            size="xl"
            onPress={() => useOnboarding.getState().play()}
          />
        </Animated.View>
      </ScrollView>
      <LanguageSheet open={languages} onClose={() => setLanguages(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: SPACE.xxl, justifyContent: 'space-between', paddingHorizontal: SPACE.xl },
  // The language slab sits at the end of the line — the left, in Arabic.
  top: { alignItems: 'flex-end', marginBottom: -SPACE.xxl },
  hero: { alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.xxl },
  mark: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 28,
  },
  // The brand is Latin in every language: Rubik, even when the game speaks Arabic —
  // where a right-to-left line sets it lower, so it needs the taller line too.
  name: { fontFamily: LATIN_FONT.display, fontSize: 54, lineHeight: lh(60), marginTop: SPACE.sm },
  moves: { alignItems: 'center', gap: SPACE.md },
  gems: { flexDirection: 'row', gap: SPACE.md },
  actions: { gap: SPACE.md },
});
