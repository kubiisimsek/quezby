import { useState } from 'react';

import { api } from '@/api/client';
import { CodeField, ResendButton, codeSent, type CodeSent } from '@/components/EmailCode';
import { rememberMe } from '@/hooks/useMe';
import { useT } from '@/i18n';
import { messageFor } from '@/lib/errors';
import { Callout, Field, PasswordField } from '@/ui/kit';
import { FormSheet } from '@/ui/sheet';

type Failure = 'invalid' | 'mismatch' | 'short' | { error: unknown };

/**
 * An email and password to sign in with — a guest's way to keep the account,
 * or one more way in. The email counts once proved: the API emails a code
 * in the account's language and the sheet asks for it, then attaches both.
 * The profile, the lobby's reminder and Hesap bilgileri open it, each only
 * once the sheet before it has left.
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
  const [confirm, setConfirm] = useState('');
  const [sent, setSent] = useState<CodeSent | null>(null);
  const [code, setCode] = useState('');
  const [pending, setPending] = useState<'save' | 'resend' | null>(null);
  const [resent, setResent] = useState(false);
  // What failed, not its words: the line is read in the language of the moment.
  const [failure, setFailure] = useState<Failure | null>(null);

  const run = async (kind: 'save' | 'resend', action: () => Promise<void>) => {
    setPending(kind);
    setFailure(null);
    try {
      await action();
    } catch (caught) {
      setFailure({ error: caught });
    } finally {
      setPending(null);
    }
  };

  const save = () => {
    if (sent) {
      if (code.length !== 6) {
        setFailure('short');
        return;
      }
      void run('save', async () => {
        const { user } = await api.me.verifyCredentials(code);
        rememberMe(user);
        onClose();
      });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim()) || password.length < 8) {
      setFailure('invalid');
      return;
    }
    if (password !== confirm) {
      setFailure('mismatch');
      return;
    }
    void run('save', async () => {
      setSent(codeSent(await api.me.linkCredentials({ email: email.trim(), password })));
    });
  };

  const resend = () =>
    void run('resend', async () => {
      setResent(false);
      setSent(codeSent(await api.me.resendCredentials()));
      setCode('');
      setResent(true);
    });

  // A sheet opened again starts clean.
  const closed = () => {
    setSent(null);
    setCode('');
    setPassword('');
    setConfirm('');
    setResent(false);
    setFailure(null);
    onClosed?.();
  };

  const words = t.auth.credentials;
  const error =
    failure === 'invalid'
      ? words.invalid
      : failure === 'mismatch'
        ? t.auth.register.mismatch
        : failure === 'short'
          ? t.auth.verify.short
          : failure
            ? messageFor(failure.error, t)
            : null;

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      onClosed={closed}
      title={guest ? t.auth.keepAccount : words.title}
      description={sent ? t.auth.verify.body(sent.email) : guest ? words.guestBody : words.body}
      submitLabel={sent ? t.auth.verify.submit : guest ? words.guestSubmit : words.submit}
      submitIcon={sent ? 'check' : 'shield'}
      onSubmit={save}
      pending={pending === 'save'}
      disabled={pending === 'resend'}
      error={error}
    >
      {sent ? (
        <>
          <CodeField value={code} onChange={setCode} />
          {resent ? <Callout>{t.auth.verify.sent}</Callout> : null}
          <ResendButton sent={sent} pending={pending === 'resend'} disabled={pending === 'save'} onPress={resend} />
        </>
      ) : (
        <>
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
          <PasswordField
            label={t.auth.confirmPassword}
            isNew
            value={confirm}
            onChangeText={setConfirm}
          />
        </>
      )}
    </FormSheet>
  );
}
