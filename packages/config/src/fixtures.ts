import type { Locale } from '@quezby/types';

import { ANALYTICS, ANALYTICS_EVENTS, ANALYTICS_MILESTONES, ANALYTICS_SCREENS } from './analytics';
import { CHECKPOINTS, prefixHash, sha256Hex } from './checkpoints';
import { CATALOGS, SALT, mix, postFor, type ContentKind } from './content';
import {
  LOCALES,
  bestLocale,
  groupDigits,
  isRtl,
  pluralCategory,
  type PluralCategory,
} from './locales';
import { PACE } from './pace';

/**
 * Fixtures the API's PHP twins are tested against (`tests/Unit/ContentParityTest.php`,
 * `PaceParityTest.php`, `CheckpointParityTest.php`, `AnalyticsParityTest.php`,
 * `LocaleParityTest.php`), built deterministically
 * so a test can rebuild them and fail when the committed files have gone stale.
 */
const KINDS: ContentKind[] = ['skip', 'like', 'hold', 'freeze'];
const SEEDS = [1, 42, 7919, 123456789, 2147483647, 4294967295];

export function buildContent() {
  return {
    catalogs: Object.entries(CATALOGS).map(([version, catalog]) => ({
      version: Number(version),
      ids: Object.fromEntries(KINDS.map((kind) => [kind, catalog[kind].map((post) => post.id)])),
      // Each id's emoji and format: a post slipped into another's place shows in the diff.
      faces: Object.fromEntries(
        KINDS.map((kind) => [kind, catalog[kind].map((post) => `${post.emoji} ${post.body.format}`)]),
      ),
    })),
    mix: SEEDS.flatMap((seed) =>
      [0, 1, 7, 19, 500, 4999].flatMap((index) =>
        Object.values(SALT).map((salt) => ({ seed, index, salt, value: mix(seed, index, salt) })),
      ),
    ),
    picks: SEEDS.flatMap((seed) =>
      [0, 3, 20, 77, 400].flatMap((index) =>
        KINDS.map((kind) => ({ seed, index, kind, version: 1, id: postFor(seed, index, kind, 1).id })),
      ),
    ),
  };
}

export function buildPace() {
  return PACE;
}

/** The analytics catalog and limits, for `tests/Unit/AnalyticsParityTest.php`. */
export function buildAnalytics() {
  return {
    screens: ANALYTICS_SCREENS,
    events: ANALYTICS_EVENTS,
    milestones: ANALYTICS_MILESTONES,
    limits: {
      visitsPerBatch: ANALYTICS.visitsPerBatch,
      journeySteps: ANALYTICS.journeySteps,
      maxCount: ANALYTICS.maxCount,
      maxAgeDays: ANALYTICS.maxAgeDays,
      maxVisitSeconds: ANALYTICS.maxVisitSeconds,
    },
  };
}

/** A log that looks like play — every gesture, times and holds — from a fixed stream. */
function sampleLog(seed: number, length: number): Array<[number, number, number]> {
  const log: Array<[number, number, number]> = [];
  for (let index = 0; index < length; index += 1) {
    const gesture = mix(seed, index, SALT.background) % 4;
    const t = 250 + (mix(seed, index, SALT.post) % 900);
    const d = gesture === 2 ? 300 + (mix(seed, index, SALT.likes) % 1500) : 0;
    log.push([gesture, t, d]);
  }
  return log;
}

export function buildCheckpoints() {
  const logs = [
    { seed: 7, length: 0 },
    { seed: 42, length: 1 },
    { seed: 7919, length: 64 },
    { seed: 4294967295, length: 685 },
  ];
  return {
    marksMs: CHECKPOINTS.marksMs,
    maxReceipts: CHECKPOINTS.maxReceipts,
    sha256: ['', 'abc', 'Quezby · Günün akışı', 'a'.repeat(1000)].map((text) => ({
      text,
      hex: sha256Hex(text),
    })),
    prefixes: logs.flatMap(({ seed, length }) => {
      const actions = sampleLog(seed, length);
      const counts = [...new Set([0, 1, Math.floor(length / 2), length])].filter((count) => count <= length);
      return counts.map((count) => ({ actions, count, hash: prefixHash(actions, count) }));
    }),
  };
}


/**
 * The forms Laravel's `trans_choice` picks between, per language, in its order:
 * Turkish has one, Arabic six. A category the list lacks (`many` in French or
 * Spanish) is the last form.
 */
const LARAVEL_FORMS: Record<Locale, readonly PluralCategory[]> = {
  tr: ['other'],
  en: ['one', 'other'],
  de: ['one', 'other'],
  ar: ['zero', 'one', 'two', 'few', 'many', 'other'],
  fr: ['one', 'other'],
  es: ['one', 'other'],
};

/** The languages, how each groups digits and counts, and how a phone's tags resolve — for `LocaleParityTest.php`. */
export function buildLocales() {
  const values = [0, 7, 999, 1000, 1234, 9999, 12345, 123456, 1234567, -1234, -12345];
  const counts = [0, 1, 2, 3, 10, 11, 99, 100, 101, 102, 103, 111, 1000000];
  const tags = [
    ['tr-TR'],
    ['de-AT', 'en-US'],
    ['ar_SA'],
    ['zh-Hant-TW', 'fr-CA'],
    ['ja-JP'],
    ['EN'],
    ['pt-BR', 'es-419'],
    [],
  ];
  return {
    locales: LOCALES,
    rtl: LOCALES.filter(isRtl),
    groups: LOCALES.flatMap((locale) =>
      values.map((value) => ({ locale, value, text: groupDigits(value, locale) })),
    ),
    plurals: LOCALES.flatMap((locale) =>
      counts.map((count) => {
        const category = pluralCategory(locale, count);
        const forms = LARAVEL_FORMS[locale];
        const at = forms.indexOf(category);
        return { locale, count, category, index: at >= 0 ? at : forms.length - 1 };
      }),
    ),
    tags: tags.map((list) => ({ tags: list, locale: bestLocale(list) })),
  };
}
