import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRtl } from '@quezby/config';
import type { Locale } from '@quezby/types';

import { APP_BUILD, APP_VERSION } from '@/config/env';
import { nativeRtl, restartApp, setNativeRtl } from '@/i18n/native';

const GUARD_KEY = 'quezby.direction.v1';

type Direction = 'ltr' | 'rtl';

/** The last reload made to turn the app around, and for which build. */
type Guard = { to: Direction; build: string };

const BUILD = `${APP_VERSION}+${APP_BUILD}`;

/** Whether reading `locale` needs the app turned the other way — a reload. */
export function needsFlip(locale: Locale): boolean {
  return isRtl(locale) !== nativeRtl();
}

async function readGuard(): Promise<Guard | null> {
  try {
    const raw = await AsyncStorage.getItem(GUARD_KEY);
    return raw ? (JSON.parse(raw) as Guard) : null;
  } catch {
    return null;
  }
}

/** The app reads the right way: a later flip may try again. */
export async function clearFlipGuard(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GUARD_KEY);
  } catch {
    // Nothing to clear is as good as cleared.
  }
}

/**
 * Turns the app to read `locale`'s way and reloads it. The launch after a
 * flip that did not take (a phone that ignores the flags) must not reload
 * again and again: an automatic flip — at launch, or when an account's
 * language is taken — is tried once per build and direction, and after that
 * the game plays on as it reads. A flip the player asked for is always tried.
 * Returns whether the app is reloading.
 */
export async function flipTo(locale: Locale, { automatic }: { automatic: boolean }): Promise<boolean> {
  const to: Direction = isRtl(locale) ? 'rtl' : 'ltr';
  if (automatic) {
    const guard = await readGuard();
    if (guard && guard.to === to && guard.build === BUILD) return false;
  }
  setNativeRtl(to === 'rtl');
  try {
    await AsyncStorage.setItem(GUARD_KEY, JSON.stringify({ to, build: BUILD } satisfies Guard));
  } catch {
    // Without the guard a flip that never takes could loop: better not to flip.
    return false;
  }
  restartApp(`direction:${to}`);
  return true;
}
