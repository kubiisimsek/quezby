import { pluralCategory, type PluralCategory } from '@quezby/config';
import type { Locale } from '@quezby/types';

/** A count's forms in one language; `other` is the one every language has. */
export type PluralForms = Partial<Record<PluralCategory, string>> & { other: string };

/**
 * The form of a sentence that fits the count: `plural('ar', 2, { two: …, … })`.
 * A form the language does not use falls back to `other`.
 */
export function plural(locale: Locale, count: number, forms: PluralForms): string {
  return forms[pluralCategory(locale, count)] ?? forms.other;
}
