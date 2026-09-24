import { ApiError } from '@quezby/sdk';
import type { SocialProvider } from '@quezby/types';
import { useCallback, useState } from 'react';

import { api } from '@/api/client';
import { installId, useSession } from '@/auth/session';
import { SignInCancelled, appleCredential, googleCredential, socialAvailability } from '@/auth/social';
import { APP_PLATFORM } from '@/config/env';
import { rememberMe } from '@/hooks/useMe';
import { messageFor } from '@/lib/errors';

const NAMES: Record<SocialProvider, string> = { apple: 'Apple', google: 'Google' };

/**
 * Apple and Google, for the welcome, the login and "Hesabını koru": sign in
 * (or up) with one, attach one to the current account, or detach it. The API
 * checks every token; the phone only carries it there.
 */
export function useSocialAuth() {
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (provider: SocialProvider, action: () => Promise<void>) => {
    setBusy(provider);
    setError(null);
    try {
      await action();
    } catch (failure) {
      if (failure instanceof SignInCancelled) return;
      setError(
        failure instanceof ApiError
          ? messageFor(failure)
          : `${NAMES[provider]} ile giriş şu an yapılamadı. Biraz sonra tekrar dene.`,
      );
    } finally {
      setBusy(null);
    }
  }, []);

  const signIn = useCallback(
    (provider: SocialProvider) =>
      run(provider, async () => {
        const device = { platform: APP_PLATFORM, installId: await installId() };
        const auth =
          provider === 'apple'
            ? await api.auth.apple({ ...(await appleCredential()), ...device })
            : await api.auth.google({ ...(await googleCredential()), ...device });
        await useSession.getState().signIn(auth.token, auth.user);
      }),
    [run],
  );

  const link = useCallback(
    (provider: SocialProvider) =>
      run(provider, async () => {
        const { user } =
          provider === 'apple'
            ? await api.me.linkApple(await appleCredential())
            : await api.me.linkGoogle(await googleCredential());
        rememberMe(user);
      }),
    [run],
  );

  const unlink = useCallback(
    (provider: SocialProvider) =>
      run(provider, async () => {
        const { user } = await api.me.unlink(provider);
        rememberMe(user);
      }),
    [run],
  );

  return { available: socialAvailability(), busy, error, signIn, link, unlink };
}
