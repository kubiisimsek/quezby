import type { Locale, Me } from '@quezby/types';

import { sessionSaved, useSession } from '@/auth/session';
import { useLanguage } from '@/i18n/language';

/**
 * An account this phone has not seen brings its language: taken at once, or —
 * when it reads the other way — once the session is safely in the keychain,
 * with a reload. Call it before the account's screens draw, so nothing shows
 * in the phone's language first.
 */
export async function adoptAccountLanguage(user: { id: string; locale: Locale }): Promise<void> {
  const flip = await useLanguage.getState().takeAccount(user);
  if (!flip) return;
  await sessionSaved();
  await useLanguage.getState().reload();
}

/**
 * Signs in to an account — email, Apple, Google — taking its language first,
 * so the lobby draws in it from the first frame. When it reads the other way
 * the app reloads, but only once the session is in the keychain: Android
 * starts the process over, and a token still on its way would be lost.
 */
export async function signInToAccount(token: string, user: Me): Promise<void> {
  const flip = await useLanguage.getState().takeAccount(user);
  await useSession.getState().signIn(token, user);
  if (flip) await useLanguage.getState().reload();
}
