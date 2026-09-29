import { ApiError } from '@quezby/sdk';
import type { SocialProvider } from '@quezby/types';
import { useCallback, useState } from 'react';

import { api } from '@/api/client';
import { installId } from '@/auth/session';
import { SignInCancelled, appleCredential, googleCredential, socialAvailability } from '@/auth/social';
import { APP_PLATFORM } from '@/config/env';
import { signInToAccount } from '@/hooks/accountLanguage';
import { rememberMe } from '@/hooks/useMe';
import { useT } from '@/i18n';
import { messageFor } from '@/lib/errors';
import { useOnboarding } from '@/stores/onboarding';

/** The companies' own names — the same in every language. */
const NAMES: Record<SocialProvider, string> = { apple: 'Apple', google: 'Google' };

/**
 * Apple and Google, for the ways in and "Hesabını koru": sign in (or up) with
 * one, attach one to the current account, or detach it. The API checks every
 * token; the phone only carries it there. A sign-in starts the account's
 * first steps on this phone — the name only while it is still the automatic
 * one — before the session, so the lobby never flashes by. `error` says what went wrong
 * last, in the player's language; `errorCode` is the API's code for it —
 * `identity_taken` when the account belongs to another player.
 */
export function useSocialAuth() {
  const t = useT();
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  // What failed, not its words: the line is read in the language of the moment.
  const [failure, setFailure] = useState<{ provider: SocialProvider; error: unknown } | null>(
    null,
  );

  const run = useCallback(async (provider: SocialProvider, action: () => Promise<void>) => {
    setBusy(provider);
    setFailure(null);
    try {
      await action();
    } catch (caught) {
      if (caught instanceof SignInCancelled) return;
      setFailure({ provider, error: caught });
    } finally {
      setBusy(null);
    }
  }, []);

  const apiError = failure?.error instanceof ApiError ? failure.error : null;
  const errorCode: ApiError['code'] | null = apiError?.code ?? null;
  const error = !failure
    ? null
    : apiError
      ? messageFor(apiError, t)
      : t.auth.social.failed(NAMES[failure.provider]);

  const signIn = useCallback(
    (provider: SocialProvider) =>
      run(provider, async () => {
        const device = { platform: APP_PLATFORM, installId: await installId() };
        const auth =
          provider === 'apple'
            ? await api.auth.apple({ ...(await appleCredential()), ...device })
            : await api.auth.google({ ...(await googleCredential()), ...device });
        useOnboarding.getState().begin(auth.user, true);
        // A returning account brings its language; a new one was born in this phone's.
        await signInToAccount(auth.token, auth.user);
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

  return { available: socialAvailability(), busy, error, errorCode, signIn, link, unlink };
}
