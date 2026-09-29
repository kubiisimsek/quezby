import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { api } from '@/api/client';
import { CodeField, ResendButton, codeSent, type CodeSent } from '@/components/EmailCode';
import { signInToAccount } from '@/hooks/accountLanguage';
import { useT } from '@/i18n';
import { messageFor } from '@/lib/errors';
import type { RootStackParamList } from '@/navigation/types';
import { useOnboarding } from '@/stores/onboarding';
import { Button, Callout, IconChip, Screen, TopBar, Txt } from '@/ui/kit';
import { SPACE } from '@/ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

/**
 * The code emailed to a new account's address. The right one makes the
 * account and signs it in — its name comes next. A new code can be asked
 * for once the API's wait is over; a code used up by wrong tries says so,
 * and a new one is still a tap away.
 */
export function VerifyEmailScreen({ navigation, route }: Props) {
  const t = useT();
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [sent, setSent] = useState<Pick<CodeSent, 'resendIn' | 'at'>>(() => ({
    resendIn: route.params.resendIn ?? 60,
    at: Date.now(),
  }));
  const [pending, setPending] = useState<'verify' | 'resend' | null>(null);
  const [resent, setResent] = useState(false);
  // What failed, not its words: the line is read in the language of the moment.
  const [failure, setFailure] = useState<'short' | { error: unknown } | null>(null);
  const words = t.auth.verify;

  const verify = async () => {
    if (code.length !== 6) {
      setFailure('short');
      return;
    }
    setPending('verify');
    setFailure(null);
    try {
      const auth = await api.auth.verifyRegistration({ email, code });
      // The first steps are set before the session, so the lobby never flashes by.
      useOnboarding.getState().begin(auth.user, true);
      await signInToAccount(auth.token, auth.user);
    } catch (caught) {
      setFailure({ error: caught });
      setPending(null);
    }
  };

  const resend = async () => {
    setPending('resend');
    setFailure(null);
    setResent(false);
    try {
      setSent(codeSent(await api.auth.resendRegistration({ email })));
      setCode('');
      setResent(true);
    } catch (caught) {
      setFailure({ error: caught });
    } finally {
      setPending(null);
    }
  };

  const error =
    failure === 'short' ? words.short : failure ? messageFor(failure.error, t) : null;

  return (
    <Screen>
      <TopBar
        title={words.title}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.head}>
            <IconChip icon="mail" tone="primary" size="lg" />
            <Txt variant="body" align="center">
              {words.body(email)}
            </Txt>
            <Txt variant="meta" tone="faint" align="center">
              {words.spam}
            </Txt>
          </View>
          <CodeField value={code} onChange={setCode} />
          {resent ? <Callout>{words.sent}</Callout> : null}
          {error ? <Callout tone="bad">{error}</Callout> : null}
          <Button
            label={words.submit}
            icon="check"
            tone="primary"
            loading={pending === 'verify'}
            disabled={pending === 'resend'}
            onPress={() => void verify()}
          />
          <ResendButton
            sent={sent}
            pending={pending === 'resend'}
            disabled={pending === 'verify'}
            onPress={() => void resend()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { gap: SPACE.lg, padding: SPACE.xl },
  head: { alignItems: 'center', gap: SPACE.sm },
});
