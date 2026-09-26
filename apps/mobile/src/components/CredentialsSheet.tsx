import { useState } from 'react';

import { api } from '@/api/client';
import { rememberMe } from '@/hooks/useMe';
import { useT } from '@/i18n';
import { messageFor } from '@/lib/errors';
import { Field, PasswordField } from '@/ui/kit';
import { FormSheet } from '@/ui/sheet';

/**
 * An email and password to sign in with — a guest's way to keep the account,
 * or one more way in. The profile, a new player's "Hesabını koru" step and
 * the lobby's reminder open it, each only once the sheet before it has left.
 */
export function CredentialsSheet({
  open,
  guest,
  onClose,
  onClosed,
}: {
  open: boolean;
  guest: boolean;
  onClose: () => void;
  onClosed?: () => void;
}) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  // What failed, not its words: the line is read in the language of the moment.
  const [failure, setFailure] = useState<'invalid' | { error: unknown } | null>(null);

  const emailOk = /\S+@\S+\.\S+/.test(email.trim());
  const passwordOk = password.length >= 8;

  const save = async () => {
    if (!emailOk || !passwordOk) {
      setFailure('invalid');
      return;
    }
    setPending(true);
    setFailure(null);
    try {
      const { user } = await api.me.linkCredentials({
        email: email.trim(),
        password,
      });
      rememberMe(user);
      onClose();
    } catch (caught) {
      setFailure({ error: caught });
    } finally {
      setPending(false);
    }
  };

  const words = t.auth.credentials;
  const error =
    failure === 'invalid' ? words.invalid : failure ? messageFor(failure.error, t) : null;

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      onClosed={onClosed}
      title={guest ? t.auth.keepAccount : words.title}
      description={guest ? words.guestBody : words.body}
      submitLabel={guest ? words.guestSubmit : words.submit}
      submitIcon="shield"
      onSubmit={() => void save()}
      pending={pending}
      error={error}
    >
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
        hint={words.passwordHint}
      />
    </FormSheet>
  );
}
