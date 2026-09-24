import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import { installId, useSession } from '@/auth/session';
import { APP_PLATFORM } from '@/config/env';
import { REEL_GUIDE, REEL_ORDER } from '@/game/howTo';
import { useSocialAuth } from '@/hooks/useSocialAuth';
import { messageFor } from '@/lib/errors';
import type { RootStackParamList } from '@/navigation/types';
import { BrandMark } from '@/ui/brand-mark';
import { Button, Callout, IconChip, Screen, SocialButton, Stamp, Txt } from '@/ui/kit';
import { useEntrance } from '@/ui/motion';
import { DEPTH, RADIUS, SPACE, useTheme } from '@/ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

/**
 * The first screen: what the game is in four lines, and the ways in. Apple
 * or Google keep the account from the first run; "Misafir olarak başla" puts
 * no form between a new player and that run — a guest can keep the account
 * later.
 */
export function WelcomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const social = useSocialAuth();
  const hero = useEntrance(0, 24);
  const rules = useEntrance(1);
  const actions = useEntrance(2);

  const startAsGuest = async () => {
    setPending(true);
    setError(null);
    try {
      const auth = await api.auth.guest({
        platform: APP_PLATFORM,
        installId: await installId(),
      });
      await useSession.getState().signIn(auth.token, auth.user);
    } catch (caught) {
      setError(messageFor(caught));
      setPending(false);
    }
  };

  return (
    <Screen>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + SPACE.xl, paddingBottom: insets.bottom + SPACE.xl },
        ]}
      >
        <Animated.View style={[styles.hero, hero]}>
          <Stamp from={0.4}>
            <View style={[styles.mark, { shadowColor: theme.glow }]}>
              <BrandMark size={96} />
            </View>
          </Stamp>
          <Txt variant="hero" align="center" style={styles.name}>
            Quezby
          </Txt>
          <Txt variant="heading" tone="muted" align="center">
            Kaydırma alışkanlığın, rekabete dönüştü.
          </Txt>
        </Animated.View>

        <Animated.View style={[styles.rules, rules]}>
          {REEL_ORDER.map((kind, index) => {
            const rule = REEL_GUIDE[kind];
            return (
              <View
                key={kind}
                style={[
                  styles.rule,
                  {
                    backgroundColor: theme.tile,
                    borderColor: theme.outline,
                    transform: [{ rotate: index % 2 === 0 ? '-1.2deg' : '1.2deg' }],
                  },
                ]}
              >
                <View style={[styles.ruleEdge, { backgroundColor: theme.tileHi }]} />
                <IconChip icon={rule.icon} tone={rule.tone === 'neutral' ? 'secondary' : rule.tone} />
                <View style={styles.ruleText}>
                  <Txt variant="heading">{rule.title}</Txt>
                  <Txt variant="meta" tone="muted">
                    {rule.body}
                  </Txt>
                </View>
              </View>
            );
          })}
          <Txt variant="meta" tone="muted" align="center" style={styles.goal}>
            Dopamin barın bitmeden en yüksek skoru yap. Her tur biraz daha hızlı.
          </Txt>
        </Animated.View>

        <Animated.View style={[styles.actions, actions]}>
          {error ?? social.error ? <Callout tone="bad">{error ?? social.error}</Callout> : null}
          <Button
            label="Misafir olarak başla"
            icon="play"
            tone="play"
            size="xl"
            onPress={() => void startAsGuest()}
            loading={pending}
            disabled={social.busy !== null}
          />
          {social.available.apple ? (
            <SocialButton
              provider="apple"
              loading={social.busy === 'apple'}
              disabled={social.busy !== null || pending}
              onPress={() => void social.signIn('apple')}
            />
          ) : null}
          {social.available.google ? (
            <SocialButton
              provider="google"
              loading={social.busy === 'google'}
              disabled={social.busy !== null || pending}
              onPress={() => void social.signIn('google')}
            />
          ) : null}
          <Button
            label="Hesabım var, giriş yap"
            tone="secondary"
            onPress={() => navigation.navigate('Login')}
          />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: SPACE.xxl, justifyContent: 'space-between', paddingHorizontal: SPACE.xl },
  hero: { alignItems: 'center', gap: SPACE.sm },
  mark: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 28,
  },
  name: { fontSize: 54, lineHeight: 60, marginTop: SPACE.sm },
  rules: { gap: SPACE.ms },
  rule: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + DEPTH.lipSm,
    borderRadius: RADIUS.panel,
    borderWidth: DEPTH.outline,
    flexDirection: 'row',
    gap: SPACE.md,
    overflow: 'hidden',
    padding: SPACE.md,
  },
  ruleEdge: { height: 3, left: 0, position: 'absolute', right: 0, top: 0 },
  ruleText: { flex: 1, gap: SPACE.xxs },
  goal: { marginTop: SPACE.xs },
  actions: { gap: SPACE.md },
});
