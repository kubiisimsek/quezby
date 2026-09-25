import { useState } from 'react';

import { api } from '@/api/client';
import { rememberMe } from '@/hooks/useMe';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailOk = /\S+@\S+\.\S+/.test(email.trim());
  const passwordOk = password.length >= 8;

  const save = async () => {
    if (!emailOk || !passwordOk) {
      setError('Geçerli bir e-posta ve en az 8 karakterlik bir şifre yaz.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { user } = await api.me.linkCredentials({
        email: email.trim(),
        password,
      });
      rememberMe(user);
      onClose();
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      onClosed={onClosed}
      title={guest ? 'Hesabını koru' : 'E-posta bağla'}
      description={
        guest
          ? 'Bu hesap şu an yalnızca bu telefonda. E-posta bağlarsan başka cihazdan da girersin.'
          : 'Bu e-posta ve şifreyle de girersin.'
      }
      submitLabel={guest ? 'Hesabı koru' : 'E-postayı bağla'}
      submitIcon="shield"
      onSubmit={() => void save()}
      pending={pending}
      error={error}
    >
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
      <PasswordField
        label="Şifre"
        isNew
        value={password}
        onChangeText={setPassword}
        hint="En az 8 karakter."
      />
    </FormSheet>
  );
}
