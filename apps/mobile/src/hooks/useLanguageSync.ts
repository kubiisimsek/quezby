import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { adoptAccountLanguage } from '@/hooks/accountLanguage';
import { rememberMe } from '@/hooks/useMe';
import { useLanguage } from '@/i18n/language';

/**
 * The account's language and the phone's, kept one:
 *
 * - An account this phone has not seen before — a sign-in on a new phone, a
 *   session the keychain kept across a reinstall, an account from before
 *   languages — brings its language with it (`takeAccount`), reloading the
 *   app if it reads the other way.
 * - After that the phone decides: whatever it plays in is written to the
 *   account (`PUT /me/locale`), and a write the network missed is tried again
 *   on the next return to the app. This is the only place that writes it.
 */
export function useLanguageSync(): void {
  const token = useSession((state) => state.token);
  const userId = useSession((state) => state.user?.id ?? null);
  const accountLocale = useSession((state) => state.user?.locale ?? null);
  const locale = useLanguage((state) => state.locale);
  const seen = useLanguage((state) => state.account);
  const ready = useLanguage((state) => state.phase === 'ready');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setAttempt((count) => count + 1);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!ready || !token || !userId || !accountLocale) return;

    if (seen !== userId) {
      void adoptAccountLanguage({ id: userId, locale: accountLocale });
      return;
    }

    if (accountLocale === locale) return;
    let cancelled = false;
    api.me
      .updateLocale(locale)
      .then(({ user }) => {
        // A newer pick is on its way: this answer no longer counts.
        if (cancelled || useLanguage.getState().locale !== user.locale) return;
        rememberMe(user);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [accountLocale, attempt, locale, ready, seen, token, userId]);
}
