import { USERNAME_MESSAGES, normalizeUsername, validateUsername } from '@quezby/config';
import { useEffect, useState } from 'react';

import { api } from '@/api/client';

export type UsernameCheck =
  | { state: 'empty' }
  | { state: 'invalid'; message: string }
  | { state: 'current'; normalized: string }
  | { state: 'checking'; normalized: string }
  | { state: 'available'; normalized: string }
  | { state: 'taken'; normalized: string; message: string }
  | { state: 'unknown'; normalized: string };

const DEBOUNCE_MS = 350;

/**
 * The rules first, on the phone, as the player types — the same function the
 * API runs — and only a well-formed name goes to the API to ask whether it is
 * free. `current` is the player's own name, which is never "taken" by them —
 * and never refused either, though the automatic `guest48128742` is a name
 * the rules keep from anyone picking it.
 */
export function useUsernameCheck(value: string, current?: string | null): UsernameCheck {
  const [check, setCheck] = useState<UsernameCheck>({ state: 'empty' });

  useEffect(() => {
    if (value.trim().length === 0) {
      setCheck({ state: 'empty' });
      return;
    }
    if (current && normalizeUsername(value) === current) {
      setCheck({ state: 'current', normalized: current });
      return;
    }
    const result = validateUsername(value);
    if (!result.ok) {
      setCheck({ state: 'invalid', message: USERNAME_MESSAGES[result.problem] });
      return;
    }
    const normalized = result.normalized;

    setCheck({ state: 'checking', normalized });
    let cancelled = false;
    const timeout = setTimeout(() => {
      api.usernames
        .check(normalized)
        .then((answer) => {
          if (cancelled) return;
          if (answer.available) {
            setCheck({ state: 'available', normalized });
          } else if (answer.reason === 'taken') {
            setCheck({ state: 'taken', normalized, message: USERNAME_MESSAGES.taken });
          } else {
            const reason = answer.reason as keyof typeof USERNAME_MESSAGES | null;
            setCheck({
              state: 'invalid',
              message: reason && reason in USERNAME_MESSAGES
                ? USERNAME_MESSAGES[reason]
                : 'Bu kullanıcı adı kullanılamaz.',
            });
          }
        })
        .catch(() => {
          if (!cancelled) setCheck({ state: 'unknown', normalized });
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [value, current]);

  return check;
}
