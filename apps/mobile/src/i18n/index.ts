import type { Locale } from '@quezby/types';

import { currentLocale, useLanguage } from '@/i18n/language';
import { CATALOGS, type Messages } from '@/i18n/messages';

export { handle, iso, ltr } from '@/i18n/format';
export { currentLocale, useLanguage } from '@/i18n/language';
export type { Messages } from '@/i18n/messages';
export { plural } from '@/i18n/plural';

/**
 * The words of the language the game speaks now. A screen that asks for them
 * draws again when the player picks another language.
 */
export function useT(): Messages {
  return CATALOGS[useLanguage((state) => state.locale)];
}

/** The same words outside React — read when called, never kept. */
export function getT(): Messages {
  return CATALOGS[currentLocale()];
}

export function useLocale(): Locale {
  return useLanguage((state) => state.locale);
}

/** The words of one language, whatever the game speaks — the picker names each language in its own. */
export function messagesOf(locale: Locale): Messages {
  return CATALOGS[locale];
}

