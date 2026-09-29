import { ApiError } from '@quezby/sdk';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { api } from '@/api/client';
import { installId } from '@/auth/session';
import { APP_PLATFORM } from '@/config/env';
import { useT } from '@/i18n';
import { messageFor } from '@/lib/errors';
import type { RootStackParamList } from '@/navigation/types';
import { Button, Callout, Field, PasswordField, Screen, TopBar } from '@/ui/kit';
import { SPACE } from '@/ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

type Failure = 'invalid' | 'mismatch' | 'exists' | { error: unknown };

/**
 * A new email account: the email and the password twice. Nothing is made
 * yet — the API emails a code in the phone's language, and the code screen
 * makes the account. An email that already has one says so and leads back
 * to signing in with it.
 */
export function RegisterScreen({ navigation, route }: Props) {
  const t = useT();
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  // What failed, not its words: the line is read in the language of the moment.
  const [failure, setFailure] = useState<Failure | null>(null);
  const words = t.auth.register;
  const address = email.trim();

  const submit = async () => {
    if (!/\S+@\S+\.\S+/.test(address) || password.length < 8) {
      setFailure('invalid');
      return;
    }
    if (password !== confirm) {
      setFailure('mismatch');
      return;
    }
    setPending(true);
    setFailure(null);
    try {
      const sent = await api.auth.register({
        email: address,
        password,
        platform: APP_PLATFORM,
        installId: await installId(),
      });
      navigation.navigate('VerifyEmail', { email: sent.email, resendIn: sent.resendIn });
    } catch (caught) {
      setFailure(caught instanceof ApiError && caught.code === 'email_taken' ? 'exists' : { error: caught });
    } finally {
      setPending(false);
    }
  };

  const toLogin = () => navigation.popTo('SignIn', address ? { email: address } : undefined);

  const error =
    failure === 'invalid'
      ? t.auth.credentials.invalid
      : failure === 'mismatch'
        ? words.mismatch
        : failure && failure !== 'exists'
          ? messageFor(failure.error, t)
          : null;

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
          <PasswordField
            label={t.auth.password}
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
          {failure === 'exists' ? (
            <Callout tone="warn" title={words.exists}>
              <View style={styles.exists}>
                <Button label={words.toLogin} tone="neutral" size="sm" onPress={toLogin} />
              </View>
            </Callout>
          ) : null}
          {error ? <Callout tone="bad">{error}</Callout> : null}
          <Button
            label={words.submit}
            icon="userPlus"
            tone="primary"
            onPress={() => void submit()}
            loading={pending}
          />
          <Button label={words.haveAccount} tone="ghost" disabled={pending} onPress={toLogin} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { gap: SPACE.lg, padding: SPACE.xl },
  exists: { alignItems: 'flex-start', marginTop: SPACE.xs },
});
