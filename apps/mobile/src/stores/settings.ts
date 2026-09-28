import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserSettings } from '@quezby/types';
import { create } from 'zustand';

const KEY = 'quezby.settings.v1';

/**
 * The settings the phone keeps a copy of — the ones the game reads without
 * asking the network. Which notifications to send is the API's alone.
 */
export type PhoneSettings = Pick<UserSettings, 'haptics' | 'analytics'>;

export const DEFAULT_SETTINGS: PhoneSettings = { haptics: true, analytics: false };

/**
 * Where the player's answer to usage analytics stands on this phone:
 * `unasked` — not answered here yet, so the question shows; `pending` —
 * answered here, not on the account yet; `synced` — the account has it.
 */
export type Consent = 'unasked' | 'pending' | 'synced';

const CONSENTS: readonly Consent[] = ['unasked', 'pending', 'synced'];

type Stored = PhoneSettings & { consent: Consent };

/**
 * Settings live on the phone first — the game reads them every reel and must
 * not wait on a network — and follow the account to the API when they change.
 * The account's answer wins (`fromAccount`), except over an answer to usage
 * analytics still on its way to it.
 */
type SettingsState = Stored & {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** Changes only the settings it is given. */
  apply: (next: Partial<PhoneSettings>) => void;
  /** What `/me` says the account holds. */
  fromAccount: (settings: UserSettings) => void;
  /** The player's answer — yes or no — kept here until the account has it. */
  answer: (analytics: boolean) => void;
  /** The account took the answer. */
  synced: (analytics: boolean) => void;
  /** Signed out: whoever uses this phone next is asked again. */
  forgetConsent: () => void;
};

export const useSettings = create<SettingsState>((set, get) => {
  const save = (next: Partial<Stored>) => {
    set(next);
    const { haptics, analytics, consent } = get();
    void AsyncStorage.setItem(KEY, JSON.stringify({ haptics, analytics, consent }));
  };

  return {
    ...DEFAULT_SETTINGS,
    consent: 'unasked',
    hydrated: false,

    hydrate: async () => {
      if (get().hydrated) return;
      try {
        const raw = await AsyncStorage.getItem(KEY);
        set({ ...pick(raw ? (JSON.parse(raw) as Partial<Stored>) : {}), hydrated: true });
      } catch {
        set({ hydrated: true });
      }
    },

    apply: (next) => save(given(next)),

    fromAccount: (settings) => {
      const { consent } = get();
      const next: Partial<Stored> = given({ haptics: settings.haptics });
      if (consent !== 'pending' && typeof settings.analytics === 'boolean') {
        next.analytics = settings.analytics;
        // A yes given on another phone counts here too; a no still gets asked here once.
        if (consent === 'unasked' && settings.analytics) next.consent = 'synced';
      }
      save(next);
    },

    answer: (analytics) => save({ analytics, consent: 'pending' }),

    synced: (analytics) => save({ analytics, consent: 'synced' }),

    forgetConsent: () => save({ analytics: false, consent: 'unasked' }),
  };
});

/** Only the settings a change names — a missing one keeps what the phone has. */
function given(value: Partial<PhoneSettings>): Partial<PhoneSettings> {
  const next: Partial<PhoneSettings> = {};
  if (typeof value.haptics === 'boolean') next.haptics = value.haptics;
  if (typeof value.analytics === 'boolean') next.analytics = value.analytics;
  return next;
}

function pick(value: Partial<Stored>): Stored {
  return {
    ...DEFAULT_SETTINGS,
    ...given(value),
    consent: CONSENTS.find((consent) => consent === value.consent) ?? 'unasked',
  };
}
