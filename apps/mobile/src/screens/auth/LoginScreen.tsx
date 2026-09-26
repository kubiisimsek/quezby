import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { api } from '@/api/client';
import { signInToAccount } from '@/hooks/accountLanguage';
import { useSocialAuth } from '@/hooks/useSocialAuth';
import { useT } from '@/i18n';
import { messageFor } from '@/lib/errors';
import {
  Button,
  Callout,
  Divider,
  Field,
  PasswordField,
  Screen,
  SocialButton,
  TopBar,
  Txt,
} from '@/ui/kit';
import { SPACE } from '@/ui/theme';

/**
 * Signing back in to a kept account: with Apple or Google, or the email it
 * was kept with. A guest account has nothing to type — its phone holds it.
 */
export function LoginScreen() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  // What failed, not its words: the line is read in the language of the moment.
  const [failure, setFailure] = useState<'missing' | { error: unknown } | null>(null);
  const social = useSocialAuth();
  const navigation = useNavigation();
  const offersSocial = social.available.apple || social.available.google;

  const valid = /\S+@\S+\.\S+/.test(email.trim()) && password.length > 0;

  const submit = async () => {
    if (!valid) {
      setFailure('missing');
      return;
    }
    setPending(true);
    setFailure(null);
    try {
      const auth = await api.auth.login({ email: email.trim(), password });
      // An account that already exists brings its language with it.
      await signInToAccount(auth.token, auth.user);
    } catch (caught) {
      setFailure({ error: caught });
      setPending(false);
    }
  };

  const error =
    failure === 'missing' ? t.auth.login.missing : failure ? messageFor(failure.error, t) : null;

  return (
    <Screen>
      <TopBar
        title={t.auth.login.title}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Txt variant="meta" tone="muted">
            {t.auth.login.intro}
          </Txt>
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
          {social.error ? <Callout tone="bad">{social.error}</Callout> : null}
          {offersSocial ? (
            <View style={styles.or}>
              <Divider style={styles.line} />
              <Txt variant="meta" tone="faint">
                {t.auth.login.orEmail}
              </Txt>
              <Divider style={styles.line} />
            </View>
          ) : null}
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
          <PasswordField label={t.auth.password} value={password} onChangeText={setPassword} />
          {error ? <Callout tone="bad">{error}</Callout> : null}
          <Button label={t.auth.login.submit} tone="play" onPress={() => void submit()} loading={pending} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { gap: SPACE.lg, padding: SPACE.xl },
  or: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  line: { flex: 1 },
});
