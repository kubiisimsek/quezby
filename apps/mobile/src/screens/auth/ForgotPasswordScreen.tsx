import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { api } from '@/api/client';
import { CodeField, ResendButton, codeSent, type CodeSent } from '@/components/EmailCode';
import { signInToAccount } from '@/hooks/accountLanguage';
import { useT } from '@/i18n';
import { messageFor } from '@/lib/errors';
import type { RootStackParamList } from '@/navigation/types';
import { useOnboarding } from '@/stores/onboarding';
import { Button, Callout, Field, PasswordField, Screen, TopBar, Txt } from '@/ui/kit';
import { SPACE } from '@/ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

type Failure = 'email' | 'short' | 'password' | 'mismatch' | { error: unknown };

/**
 * A forgotten password, in two steps on one screen: the account's email —
 * the API answers the same whether it has an account or not — then the
 * code it emailed and the new password twice. The new password signs every
 * other phone out and this one in.
 */
export function ForgotPasswordScreen({ navigation, route }: Props) {
  const t = useT();
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [sent, setSent] = useState<CodeSent | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState<'send' | 'reset' | null>(null);
  const [resent, setResent] = useState(false);
  // What failed, not its words: the line is read in the language of the moment.
  const [failure, setFailure] = useState<Failure | null>(null);
  const words = t.auth.forgot;
  const address = email.trim();

  const send = async (again: boolean) => {
    if (!/\S+@\S+\.\S+/.test(address)) {
      setFailure('email');
      return;
    }
    setPending('send');
    setFailure(null);
    setResent(false);
    try {
      setSent(codeSent(await api.auth.forgotPassword({ email: address })));
      setResent(again);
    } catch (caught) {
      setFailure({ error: caught });
    } finally {
      setPending(null);
    }
  };

  const reset = async () => {
    const problem = code.length !== 6 ? 'short' : password.length < 8 ? 'password' : password !== confirm ? 'mismatch' : null;
    if (problem) {
      setFailure(problem);
      return;
    }
    setPending('reset');
    setFailure(null);
    try {
      const auth = await api.auth.resetPassword({ email: address, code, password });
      useOnboarding.getState().begin(auth.user, true);
      await signInToAccount(auth.token, auth.user);
    } catch (caught) {
      setFailure({ error: caught });
      setPending(null);
    }
  };

  const error =
    failure === 'email'
      ? words.email
      : failure === 'short'
        ? t.auth.verify.short
        : failure === 'password'
          ? t.auth.credentials.passwordHint
          : failure === 'mismatch'
            ? t.auth.register.mismatch
            : failure
              ? messageFor(failure.error, t)
              : null;

  const back = () => {
    if (sent) {
      setSent(null);
      setFailure(null);
      setResent(false);
      return;
    }
    navigation.goBack();
  };

  return (
    <Screen>
      <TopBar title={words.title} onBack={back} />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {sent === null ? (
            <>
              <Txt variant="body" tone="muted">
                {words.body}
              </Txt>
              <Field
                label={t.auth.email}
                icon="mail"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
              />
              {error ? <Callout tone="bad">{error}</Callout> : null}
              <Button
                label={words.send}
                icon="mail"
                tone="primary"
                loading={pending === 'send'}
                onPress={() => void send(false)}
              />
            </>
          ) : (
            <>
              <Txt variant="body" tone="muted">
                {words.codeBody(address)}
              </Txt>
              <Txt variant="meta" tone="faint">
                {t.auth.verify.spam}
              </Txt>
              <CodeField value={code} onChange={setCode} />
              <PasswordField
                label={words.newPassword}
                isNew
                value={password}
                onChangeText={setPassword}
                hint={t.auth.credentials.passwordHint}
              />
              <PasswordField
                label={t.auth.confirmPassword}
                isNew
                value={confirm}
                onChangeText={setConfirm}
              />
              {resent ? <Callout>{t.auth.verify.sent}</Callout> : null}
              {error ? <Callout tone="bad">{error}</Callout> : null}
              <Button
                label={words.submit}
                icon="check"
                tone="primary"
                loading={pending === 'reset'}
                disabled={pending === 'send'}
                onPress={() => void reset()}
              />
              <ResendButton
                sent={sent}
                pending={pending === 'send'}
                disabled={pending === 'reset'}
                onPress={() => void send(true)}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { gap: SPACE.lg, padding: SPACE.xl },
});
