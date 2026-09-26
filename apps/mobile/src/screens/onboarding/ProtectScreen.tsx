import type { SocialProvider } from '@quezby/types';
import { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { track } from '@/analytics/track';
import { useSession } from '@/auth/session';
import { CredentialsSheet } from '@/components/CredentialsSheet';
import { PROVIDER_NAMES } from '@/components/SignInWaysSheet';
import { useSocialAuth } from '@/hooks/useSocialAuth';
import { useT } from '@/i18n';
import { useOnboarding } from '@/stores/onboarding';
import { Button, Callout, IconChip, Screen, SocialButton, Stamp, Txt } from '@/ui/kit';
import { SPACE } from '@/ui/theme';

/**
 * A new guest's last first step, and one they may skip: keep the account
 * with Apple, Google or an email, so a new phone brings the name, the scores
 * and the league along. Keeping it says so before moving on — the lobby
 * would otherwise swallow the news. An Apple or Google account that already
 * belongs to another player can be switched to instead; the guest left
 * behind has nothing yet, as its practice run was never counted.
 */
export function ProtectScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const user = useSession((state) => state.user);
  const social = useSocialAuth();
  const [emailOpen, setEmailOpen] = useState(false);
  const [tried, setTried] = useState<SocialProvider | null>(null);

  if (!user) return null;

  const finish = () => useOnboarding.getState().finish();
  const busy = social.busy !== null;

  const link = async (provider: SocialProvider) => {
    setTried(provider);
    await social.link(provider);
  };

  const switchTo = async (provider: SocialProvider) => {
    await social.signIn(provider);
    if (useSession.getState().user?.id !== user.id) finish();
  };

  const words = t.auth.protect;
  const kept = tried && user.identities.includes(tried)
    ? t.auth.linked(PROVIDER_NAMES[tried])
    : user.email
      ? words.emailLinked
      : words.wayLinked;

  return (
    <Screen>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + SPACE.xxl, paddingBottom: insets.bottom + SPACE.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.head}>
          <Stamp from={0.4}>
            <IconChip icon="shield" tone={user.isGuest ? 'secondary' : 'ok'} size="lg" />
          </Stamp>
          <Txt variant="display" align="center">
            {t.auth.keepAccount}
          </Txt>
          <Txt variant="body" tone="muted" align="center">
            {words.body}
          </Txt>
        </View>

        {!user.isGuest ? (
          <View style={styles.actions}>
            <Callout title={kept}>{words.keptBody}</Callout>
            <Button label={words.continue} icon="check" tone="primary" onPress={finish} />
          </View>
        ) : (
          <View style={styles.actions}>
            {social.error ? (
              <Callout tone="bad">
                {social.errorCode === 'identity_taken'
                  ? words.identityTaken(social.error)
                  : social.error}
              </Callout>
            ) : null}
            {social.errorCode === 'identity_taken' && tried ? (
              <Button
                label={words.switchTo(PROVIDER_NAMES[tried])}
                tone="neutral"
                loading={social.busy === tried}
                disabled={busy}
                onPress={() => void switchTo(tried)}
              />
            ) : null}
            {social.available.apple ? (
              <SocialButton
                provider="apple"
                loading={social.busy === 'apple'}
                disabled={busy}
                onPress={() => void link('apple')}
              />
            ) : null}
            {social.available.google ? (
              <SocialButton
                provider="google"
                loading={social.busy === 'google'}
                disabled={busy}
                onPress={() => void link('google')}
              />
            ) : null}
            <Button
              label={t.auth.keepWithEmail}
              icon="mail"
              tone="neutral"
              disabled={busy}
              onPress={() => setEmailOpen(true)}
            />
            <Button
              label={words.notNow}
              tone="ghost"
              disabled={busy}
              onPress={() => {
                track('protect_skip');
                finish();
              }}
            />
          </View>
        )}
      </ScrollView>

      <CredentialsSheet open={emailOpen} guest onClose={() => setEmailOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: SPACE.xxl, justifyContent: 'space-between', paddingHorizontal: SPACE.xl },
  head: { alignItems: 'center', gap: SPACE.md },
  actions: { gap: SPACE.md },
});
