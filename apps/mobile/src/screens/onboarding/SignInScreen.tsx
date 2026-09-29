import { ApiError } from '@quezby/sdk';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import { installId, useSession } from '@/auth/session';
import { APP_PLATFORM } from '@/config/env';
import { signInToAccount } from '@/hooks/accountLanguage';
import { useSocialAuth } from '@/hooks/useSocialAuth';
import { useT } from '@/i18n';
import { messageFor } from '@/lib/errors';
import type { RootStackParamList } from '@/navigation/types';
import { useOnboarding } from '@/stores/onboarding';
import { BrandMark } from '@/ui/brand-mark';
import {
  Button,
  Callout,
  Divider,
  Field,
  PasswordField,
  Screen,
  SocialButton,
  Stamp,
  Txt,
} from '@/ui/kit';
import { SPACE } from '@/ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

/**
 * The ways in, after the practice run — and after signing out. On top, back
 * into an account with its email and password ("Şifremi unuttum" under it);
 * then a new account ("Hesabın yok mu? Kayıt ol"); then Apple and Google,
 * which find an account or open one; last, on as a guest. An email sign-up
 * never verified gets its code again and the code screen. Whatever comes in
 * starts its first steps before the session, so the lobby never flashes by.
 */
export function SignInScreen({ navigation, route }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const social = useSocialAuth();
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<'login' | 'guest' | null>(null);
  // What failed, not its words: the line is read in the language of the moment.
  const [failure, setFailure] = useState<'missing' | { error: unknown } | null>(null);
  const busy = social.busy !== null || pending !== null;
  const words = t.auth.join;
  const address = email.trim();

  // Back from the sign-up with an email that already has an account.
  const given = route.params?.email;
  useEffect(() => {
    if (given) setEmail(given);
  }, [given]);

  const login = async () => {
    if (!/\S+@\S+\.\S+/.test(address) || password.length === 0) {
      setFailure('missing');
      return;
    }
    setPending('login');
    setFailure(null);
    try {
      const auth = await api.auth.login({ email: address, password });
      useOnboarding.getState().begin(auth.user, true);
      await signInToAccount(auth.token, auth.user);
    } catch (caught) {
      setPending(null);
      if (caught instanceof ApiError && caught.code === 'email_unverified') {
        navigation.navigate('VerifyEmail', { email: address });
        return;
      }
      setFailure({ error: caught });
    }
  };

  const guest = async () => {
    setPending('guest');
    setFailure(null);
    try {
      const auth = await api.auth.guest({ platform: APP_PLATFORM, installId: await installId() });
      useOnboarding.getState().begin(auth.user, false);
      await useSession.getState().signIn(auth.token, auth.user);
    } catch (caught) {
      setFailure({ error: caught });
      setPending(null);
    }
  };

  const error =
    failure === 'missing' ? words.missing : failure ? messageFor(failure.error, t) : null;

  return (
    <Screen>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + SPACE.xl, paddingBottom: insets.bottom + SPACE.xl },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.head}>
            <Stamp from={0.4}>
              <BrandMark size={64} />
            </Stamp>
            <Txt variant="display" align="center">
              {words.title}
            </Txt>
          </View>

          <View style={styles.form}>
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
            <View style={styles.forgot}>
              <Button
                label={words.forgot}
                tone="ghost"
                size="sm"
                disabled={busy}
                onPress={() => navigation.navigate('ForgotPassword', { email: address || undefined })}
              />
            </View>
            {error ? <Callout tone="bad">{error}</Callout> : null}
            <Button
              label={words.submit}
              icon="check"
              tone="primary"
              loading={pending === 'login'}
              disabled={busy && pending !== 'login'}
              onPress={() => void login()}
            />
            <Button
              label={words.noAccount}
              tone="ghost"
              disabled={busy}
              onPress={() => navigation.navigate('Register', { email: address || undefined })}
            />
          </View>

          <View style={styles.or}>
            <Divider style={styles.line} />
            <Txt variant="meta" tone="faint">
              {words.or}
            </Txt>
            <Divider style={styles.line} />
          </View>

          <View style={styles.form}>
            {social.error ? <Callout tone="bad">{social.error}</Callout> : null}
            {social.available.apple ? (
              <SocialButton
                provider="apple"
                loading={social.busy === 'apple'}
                disabled={busy}
                onPress={() => void social.signIn('apple')}
              />
            ) : null}
            {social.available.google ? (
              <SocialButton
                provider="google"
                loading={social.busy === 'google'}
                disabled={busy}
                onPress={() => void social.signIn('google')}
              />
            ) : null}
            <Button
              label={words.guest}
              tone="ghost"
              loading={pending === 'guest'}
              disabled={busy && pending !== 'guest'}
              onPress={() => void guest()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, gap: SPACE.xl, paddingHorizontal: SPACE.xl },
  head: { alignItems: 'center', gap: SPACE.sm },
  form: { gap: SPACE.md },
  forgot: { alignItems: 'flex-end', marginTop: -SPACE.sm },
  or: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  line: { flex: 1 },
});
