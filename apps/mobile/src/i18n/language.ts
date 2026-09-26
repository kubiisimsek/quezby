import AsyncStorage from '@react-native-async-storage/async-storage';
import { bestLocale, isLocale } from '@quezby/config';
import type { Locale } from '@quezby/types';
import { create } from 'zustand';

import { queryClient } from '@/api/queryClient';
import { clearFlipGuard, flipTo, needsFlip } from '@/i18n/direction';
import { phoneLanguageTags } from '@/i18n/native';

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
   * The player picked a language. Between two left-to-right languages the
   * game changes at once; to or from Arabic it reloads. The account learns it
   * from `useLanguageSync`.
   */
  choose: (locale: Locale) => Promise<void>;
  /**
   * An account seen on this phone for the first time — a sign-in, or a
   * session the keychain kept across a reinstall — brings its language. True
   * when the app must reload to read it: the phase turns `restarting` and the
   * caller reloads once the session is safely stored (`reload`).
   */
  takeAccount: (user: { id: string; locale: Locale }) => Promise<boolean>;
  /** Reloads into the language taken from an account, the other way round. */
  reload: () => Promise<void>;
};

/** The first of the phone's languages the game speaks, or null. */
export function phoneLocale(): Locale | null {
  return bestLocale(phoneLanguageTags());
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
      let record: LanguageRecord;
      try {
        const raw = await AsyncStorage.getItem(KEY);
        record = pick(raw ? JSON.parse(raw) : null);
      } catch {
        record = pick(null);
      }

      const phone = phoneLocale();
      if (record.chosen && record.device && phone && phone !== record.device) {
        record = { ...record, chosen: phone, device: phone };
        await save(record);
      }

      const locale = record.chosen ?? phone ?? FALLBACK_LOCALE;
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
      settle(record, flip ? null : locale);
      await save(record);
      if (!flip) return;
      set({ phase: 'restarting' });
      if (await flipTo(locale, { automatic: false })) return;
      // The phone would not turn around: play on in the new language as the app reads.
      set({ phase: 'ready' });
      settle(record, locale);
    },

    takeAccount: async (user) => {
      const record: LanguageRecord = { chosen: user.locale, device: phoneLocale(), account: user.id };
      const flip = needsFlip(user.locale);
      settle(record, flip ? null : user.locale);
      // About to reload: the splash covers the wait, and nothing writes the old language anywhere.
      if (flip) set({ phase: 'restarting' });
      await save(record);
      return flip;
    },

    reload: async () => {
      const locale = get().chosen ?? get().locale;
      set({ phase: 'restarting' });
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
