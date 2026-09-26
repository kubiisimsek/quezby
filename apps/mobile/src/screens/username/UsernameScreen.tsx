import { isAutoUsername } from '@quezby/config';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { track } from '@/analytics/track';
import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { UsernameField } from '@/components/UsernameField';
import { rememberMe } from '@/hooks/useMe';
import { checkMessage, useUsernameCheck, type UsernameCheck } from '@/hooks/useUsernameCheck';
import { useT } from '@/i18n';
import { messageFor } from '@/lib/errors';
import { stepFor, useOnboarding } from '@/stores/onboarding';
import { BrandMark } from '@/ui/brand-mark';
import { Button, Callout, Panel, Screen, Stamp, Txt } from '@/ui/kit';
import { SPACE } from '@/ui/theme';

/**
 * What the leaderboard should call you. The rules tick off as you type and
 * the API is asked whether the name is free before the button is worth
 * pressing.
 *
 * Right after a new player's practice run it is a step they may skip: the
 * account already plays as `guest48128742`, and keeps that name until they
 * pick one — here or later on the profile. The name they pick is theirs for
 * good, and the screen says so. An account from before automatic names has
 * none, so for it this is the one question before the game.
 */
export function UsernameScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const user = useSession((state) => state.user);
  const onboarding = useOnboarding((state) => stepFor(state, user?.id) === 'nickname');
  const current = user?.username ?? null;
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);
  // What failed, not its words: the line is read in the language of the moment.
  const [failure, setFailure] = useState<{ check: UsernameCheck } | { error: unknown } | null>(
    null,
  );
  const check = useUsernameCheck(value, current);

  const ready = check.state === 'available' || check.state === 'unknown';
  const canSkip = onboarding && current !== null;
  const autoName = canSkip && isAutoUsername(current) ? current : null;

  const next = () => useOnboarding.getState().advance(useSession.getState().user?.isGuest ?? true);

  const save = async () => {
    if (!ready) {
      setFailure({ check });
      return;
    }
    setPending(true);
    setFailure(null);
    try {
      const { user: named } = await api.me.updateUsername(check.normalized);
      rememberMe(named);
      if (onboarding) next();
    } catch (caught) {
      setFailure({ error: caught });
      setPending(false);
    }
  };

  const error = !failure
    ? null
    : 'error' in failure
      ? messageFor(failure.error, t)
      : (checkMessage(failure.check, t) ?? t.username.pickFirst);

  return (
    <Screen>
      <StatusBar barStyle="light-content" />
      <View style={[styles.head, { paddingTop: insets.top + SPACE.xl }]}>
        <Stamp from={0.4}>
          <BrandMark size={64} />
        </Stamp>
        <Txt variant="display" align="center">
          {onboarding ? t.username.onboardingTitle : t.username.title}
        </Txt>
        <Txt variant="meta" tone="muted" align="center">
          {autoName ? t.username.autoName(autoName) : t.username.rules}
        </Txt>
      </View>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          <Panel style={styles.panel}>
            <UsernameField value={value} onChange={setValue} check={check} autoFocus />
          </Panel>
          {error ? <Callout tone="bad">{error}</Callout> : null}
          {onboarding ? (
            <>
              <Button
                label={t.username.save}
                tone="primary"
                icon="check"
                onPress={() => void save()}
                loading={pending}
                disabled={!ready}
              />
              {canSkip ? (
                <Button
                  label={t.username.skip}
                  tone="ghost"
                  onPress={() => {
                    track('nickname_skip');
                    next();
                  }}
                  disabled={pending}
                />
              ) : null}
            </>
          ) : (
            <Button
              label={t.username.continue}
              tone="play"
              icon="play"
              onPress={() => void save()}
              loading={pending}
              disabled={!ready}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  head: { alignItems: 'center', gap: SPACE.sm, paddingBottom: SPACE.lg, paddingHorizontal: SPACE.xl },
  panel: { gap: SPACE.md, padding: SPACE.lg },
  content: { gap: SPACE.lg, padding: SPACE.xl },
});
