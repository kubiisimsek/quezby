import { I18nManager } from 'react-native';
import { getLocales } from 'react-native-localize';
import RNRestart from 'react-native-restart';

/**
 * The phone's side of languages, in one place tests can replace.
 *
 * Which way the app reads is native: iOS and Android decide it before any
 * JavaScript runs, and it only changes on a reload. So for the life of this
 * JavaScript it is a constant — `IS_RTL` — and a language that reads the other
 * way (Arabic, or leaving it) reloads the app (`direction.ts`).
 */
export const IS_RTL: boolean = I18nManager.isRTL;

/**
 * Whether a one-line label may shrink to fit (`adjustsFontSizeToFit`). Not in
 * Arabic: iOS's shrink-to-fit cuts the tops off Cairo's tall letters, however
 * much room the line has — and Arabic words are short enough to do without it.
 */
export const SHRINK_TO_FIT: boolean = !IS_RTL;

/** The direction the native side is set to right now — for deciding a reload. */
export function nativeRtl(): boolean {
  return I18nManager.isRTL;
}

/**
 * Sets the direction the next launch reads in. Both flags: iOS and Android
 * turn right-to-left on by themselves for an Arabic phone unless RTL is
 * disallowed, and only force it when asked.
 */
export function setNativeRtl(rtl: boolean): void {
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
}

/** The phone's languages in its order of preference, e.g. `['de-AT', 'en-US']`. */
export function phoneLanguageTags(): string[] {
  try {
    return getLocales().map((locale) => locale.languageTag);
  } catch {
    return [];
  }
}

/**
 * Reloads the app. iOS reloads the JavaScript in place; Android starts the
 * process over — so everything the next launch needs must be written first.
 */
export function restartApp(reason: string): void {
  RNRestart.restart(reason);
}
