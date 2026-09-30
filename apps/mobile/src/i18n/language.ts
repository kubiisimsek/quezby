import AsyncStorage from '@react-native-async-storage/async-storage';
import { bestLocale, isLocale } from '@quezby/config';
import type { Locale } from '@quezby/types';
import { create } from 'zustand';

import { queryClient } from '@/api/queryClient';
import { clearFlipGuard, flipTo, needsFlip } from '@/i18n/direction';
import { phoneLanguageTags, restartApp } from '@/i18n/native';
import { needsNewFaces } from '@/i18n/script';

const KEY = 'quezby.language.v1';

/** A phone whose languages are none of the six plays in English. */
export const FALLBACK_LOCALE: Locale = 'en';

/** What this phone remembers about its language. */
type LanguageRecord = {
  /**
   * The language picked on this phone or taken from the account; null until
   * then, and the game speaks the phone's language.
   */
  chosen: Locale | null;
  /**
   * The phone's own language when `chosen` was set. If the phone's language
   * has changed since — the player changed it in the system's settings — that
   * is the newer wish, and the game follows it.
   */
  device: Locale | null;
  /** The account this phone last took its language from. */
  account: string | null;
};

type LanguageState = LanguageRecord & {
  /** The language the game speaks now. */
  locale: Locale;
  /**
   * `loading` until the record is read and the app reads the right way;
   * `restarting` while it reloads to turn around. The splash stays up for
   * both — nothing shows in the wrong language or direction.
   */
  phase: 'loading' | 'ready' | 'restarting';
  hydrate: () => Promise<void>;
  /**
   * The player picked a language. Between two languages read the same way
   * and set in the same faces the game changes at once; to or from Arabic,
   * Japanese or Korean it reloads. The account learns it from
   * `useLanguageSync`.
   */
  choose: (locale: Locale) => Promise<void>;
  /**
   * An account seen on this phone for the first time — a sign-in — brings
   * its language. True when the app must reload to speak it — the other way
   * round, or in other faces: the phase turns `restarting` and the caller
   * reloads once the session is safely stored (`reload`).
   */
  takeAccount: (user: { id: string; locale: Locale }) => Promise<boolean>;
  /** Reloads into the language taken from an account: the other way round, or in its own faces. */
  reload: () => Promise<void>;
};

/** The first of the phone's languages the game speaks, or null. */
export function phoneLocale(): Locale | null {
  return bestLocale(phoneLanguageTags());
}

/**
 * The language a launch starts in: the one chosen on this phone — unless the
 * phone's own language changed since, the newer wish — else the phone's, else
 * English. `Boot` reads it before the app loads, to pick the faces; `hydrate`
 * decides the same way.
 */
export async function startupLocale(): Promise<Locale> {
  return resolve(await readRecord(), phoneLocale()).locale;
}

async function readRecord(): Promise<LanguageRecord> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return pick(raw ? JSON.parse(raw) : null);
  } catch {
    return pick(null);
  }
}

function resolve(stored: LanguageRecord, phone: Locale | null): { record: LanguageRecord; locale: Locale } {
  const record =
    stored.chosen && stored.device && phone && phone !== stored.device
      ? { ...stored, chosen: phone, device: phone }
      : stored;
  return { record, locale: record.chosen ?? phone ?? FALLBACK_LOCALE };
}

function pick(value: unknown): LanguageRecord {
  const record = (value ?? {}) as Partial<Record<keyof LanguageRecord, unknown>>;
  return {
    chosen: isLocale(record.chosen) ? record.chosen : null,
    device: isLocale(record.device) ? record.device : null,
    account: typeof record.account === 'string' ? record.account : null,
  };
}

async function save(record: LanguageRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // The phone keeps playing in this language; the next launch asks again.
  }
}

function recordOf(state: LanguageRecord): LanguageRecord {
  return { chosen: state.chosen, device: state.device, account: state.account };
}

export const useLanguage = create<LanguageState>((set, get) => {
  /**
   * Keeps `record` and, unless the app must reload first, speaks `locale` —
   * in one step, so nothing ever sees the new record with the old language.
   * Anything the API wrote in the old language is asked again.
   */
  const settle = (record: LanguageRecord, locale: Locale | null) => {
    const spoken = locale !== null && get().locale !== locale;
    set(locale === null ? record : { ...record, locale });
    if (spoken) void queryClient.invalidateQueries();
  };

  return {
    chosen: null,
    device: null,
    account: null,
    locale: phoneLocale() ?? FALLBACK_LOCALE,
    phase: 'loading',

    hydrate: async () => {
      if (get().phase !== 'loading') return;
      const stored = await readRecord();
      const { record, locale } = resolve(stored, phoneLocale());
      if (record !== stored) await save(record);
      set({ ...record, locale });

      if (needsFlip(locale) && (await flipTo(locale, { automatic: true }))) {
        set({ phase: 'restarting' });
        return;
      }
      if (!needsFlip(locale)) await clearFlipGuard();
      set({ phase: 'ready' });
    },

    choose: async (locale) => {
      const record: LanguageRecord = { ...recordOf(get()), chosen: locale, device: phoneLocale() };
      const flip = needsFlip(locale);
      const faces = !flip && needsNewFaces(locale);
      settle(record, flip || faces ? null : locale);
      await save(record);
      if (!flip && !faces) return;
      set({ phase: 'restarting' });
      if (faces) {
        restartApp(`faces:${locale}`);
        return;
      }
      if (await flipTo(locale, { automatic: false })) return;
      // The phone would not turn around: play on in the new language as the app reads.
      set({ phase: 'ready' });
      settle(record, locale);
    },

    takeAccount: async (user) => {
      const record: LanguageRecord = { chosen: user.locale, device: phoneLocale(), account: user.id };
      const reload = needsFlip(user.locale) || needsNewFaces(user.locale);
      settle(record, reload ? null : user.locale);
      // About to reload: the splash covers the wait, and nothing writes the old language anywhere.
      if (reload) set({ phase: 'restarting' });
      await save(record);
      return reload;
    },

    reload: async () => {
      const locale = get().chosen ?? get().locale;
      set({ phase: 'restarting' });
      if (!needsFlip(locale) && needsNewFaces(locale)) {
        restartApp(`faces:${locale}`);
        return;
      }
      if (!(await flipTo(locale, { automatic: true }))) {
        set({ phase: 'ready' });
        settle(recordOf(get()), locale);
      }
    },
  };
});

/** The language the game speaks right now — for code outside React. */
export function currentLocale(): Locale {
  return useLanguage.getState().locale;
}
