import { LOCALE_NAMES } from '@quezby/config';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import { installId, useSession } from '@/auth/session';
import { LanguageSheet } from '@/components/LanguageSheet';
import { APP_PLATFORM } from '@/config/env';
import { REEL_ORDER, reelGuide } from '@/game/howTo';
import { useLocale, useT } from '@/i18n';
import { messageFor } from '@/lib/errors';
import type { RootStackParamList } from '@/navigation/types';
import { useOnboarding } from '@/stores/onboarding';
import { useSettings } from '@/stores/settings';
import { BrandMark } from '@/ui/brand-mark';
import { Button, Callout, ConsentCard, IconChip, Screen, Stamp, Txt } from '@/ui/kit';
import { useEntrance } from '@/ui/motion';
import { LATIN_FONT, SPACE, lh, useTheme } from '@/ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

/**
 * The first screen: the game's name, its four moves as gems, and one way in —
 * **Oyna** opens a guest account and goes straight into a practice run that
 * teaches the moves and counts nowhere. A name and a way to keep the account
 * come after it, and both can wait. A player who already has an account
 * signs in instead. Before either, once: whether the game may count how it
 * is used — nothing is counted before the answer. The game opens in the
 * phone's language; the small language slab at the top changes it before
 * anything is played.
 */
export function WelcomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const t = useT();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState(false);
  const [languages, setLanguages] = useState(false);
  // What failed, not its words: the line is read in the language of the moment.
  const [failure, setFailure] = useState<{ error: unknown } | null>(null);
  const asking = useSettings((state) => !state.hydrated || state.consent === 'unasked');
  const hero = useEntrance(0, 24);
  const moves = useEntrance(1);
  const actions = useEntrance(2);

  const play = async () => {
    setPending(true);
    setFailure(null);
    try {
      const auth = await api.auth.guest({
        platform: APP_PLATFORM,
        installId: await installId(),
      });
      // The first steps are set before the session, so the lobby never flashes by.
      useOnboarding.getState().begin(auth.user.id);
      await useSession.getState().signIn(auth.token, auth.user);
    } catch (caught) {
      setFailure({ error: caught });
      setPending(false);
    }
  };

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
            disabled={pending}
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
          {asking ? (
            <ConsentCard onAnswer={(yes) => useSettings.getState().answer(yes)} />
          ) : (
            <>
              {failure ? <Callout tone="bad">{messageFor(failure.error, t)}</Callout> : null}
              <Button
                label={t.welcome.play}
                icon="play"
                tone="play"
                size="xl"
                onPress={() => void play()}
                loading={pending}
              />
              <Button
                label={t.welcome.signIn}
                tone="secondary"
                onPress={() => navigation.navigate('Login')}
                disabled={pending}
              />
            </>
          )}
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
