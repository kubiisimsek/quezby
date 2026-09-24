import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { useSocialAuth } from '@/hooks/useSocialAuth';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const social = useSocialAuth();
  const navigation = useNavigation();
  const offersSocial = social.available.apple || social.available.google;

  const valid = /\S+@\S+\.\S+/.test(email.trim()) && password.length > 0;

  const submit = async () => {
    if (!valid) {
      setError('E-postanı ve şifreni yaz.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const auth = await api.auth.login({ email: email.trim(), password });
      await useSession.getState().signIn(auth.token, auth.user);
    } catch (caught) {
      setError(messageFor(caught));
      setPending(false);
    }
  };

  return (
    <Screen>
      <TopBar
        title="Tekrar hoş geldin"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Txt variant="meta" tone="muted">
            Hesabını Apple, Google ya da e-postayla koruduysan buradan dönebilirsin. Skorların ve
            kullanıcı adın seninle gelir.
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
                ya da e-postayla
              </Txt>
              <Divider style={styles.line} />
            </View>
          ) : null}
          <Field
            label="E-posta"
            icon="mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
          />
          <PasswordField label="Şifre" value={password} onChangeText={setPassword} />
          {error ? <Callout tone="bad">{error}</Callout> : null}
          <Button label="Giriş yap" tone="play" onPress={() => void submit()} loading={pending} />
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
