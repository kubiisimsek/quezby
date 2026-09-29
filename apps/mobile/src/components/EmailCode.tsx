import type { CodeSentResponse } from '@quezby/types';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { useT } from '@/i18n';
import { Button, Field } from '@/ui/kit';

/** A code just sent: the wait the API gave, from the moment it answered. */
export type CodeSent = { email: string; resendIn: number; at: number };

export function codeSent(response: CodeSentResponse): CodeSent {
  return { email: response.email, resendIn: response.resendIn, at: Date.now() };
}

/**
 * The six digits an email carried: a number pad, and iOS offers the code
 * from Mail when it can. Anything but digits never lands in the field.
 */
export function CodeField({
  value,
  onChange,
  autoFocus = true,
}: {
  value: string;
  onChange: (code: string) => void;
  autoFocus?: boolean;
}) {
  const t = useT();
  return (
    <Field
      label={t.auth.verify.code}
      icon="shield"
      value={value}
      onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 6))}
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete="one-time-code"
      maxLength={6}
      autoFocus={autoFocus}
      style={styles.code}
    />
  );
}

/** Seconds left before a new code may be asked for. */
export function useResendWait({ resendIn, at }: Pick<CodeSent, 'resendIn' | 'at'>): number {
  const [seconds, setSeconds] = useState(() => secondsLeft(at, resendIn));

  useEffect(() => {
    const tick = () => {
      const left = secondsLeft(at, resendIn);
      setSeconds(left);
      return left;
    };
    if (tick() === 0) return;
    const timer = setInterval(() => {
      if (tick() === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [at, resendIn]);

  return seconds;
}

function secondsLeft(at: number, resendIn: number): number {
  return Math.max(0, Math.ceil((at + resendIn * 1000 - Date.now()) / 1000));
}

/** "Kodu tekrar gönder", counting down the API's wait before it can be pressed. */
export function ResendButton({
  sent,
  pending,
  disabled,
  onPress,
}: {
  sent: Pick<CodeSent, 'resendIn' | 'at'>;
  pending: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const t = useT();
  const wait = useResendWait(sent);
  const clock = `${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, '0')}`;
  return (
    <Button
      label={wait > 0 ? t.auth.verify.resendIn(clock) : t.auth.verify.resend}
      icon="refresh"
      tone="ghost"
      loading={pending}
      disabled={disabled || wait > 0}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  code: { fontSize: 22, letterSpacing: 6 },
});
