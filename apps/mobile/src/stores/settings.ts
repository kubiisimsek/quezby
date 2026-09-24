import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserSettings } from '@quezby/types';
import { create } from 'zustand';

const KEY = 'quezby.settings.v1';

export const DEFAULT_SETTINGS: UserSettings = { haptics: true };

/**
 * Settings live on the phone first — the game reads them every reel and must
 * not wait on a network — and follow the account to the API when they change.
 */
type SettingsState = UserSettings & {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  apply: (next: Partial<UserSettings>) => void;
};

export const useSettings = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const stored = raw ? (JSON.parse(raw) as Partial<UserSettings>) : {};
      set({ ...DEFAULT_SETTINGS, ...pick(stored), hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  apply: (next) => {
    const merged = { ...pick(get()), ...pick(next) };
    set(merged);
    void AsyncStorage.setItem(KEY, JSON.stringify(merged));
  },
}));

function pick(value: Partial<UserSettings>): UserSettings {
  return {
    haptics:
      typeof value.haptics === 'boolean' ? value.haptics : DEFAULT_SETTINGS.haptics,
  };
}
