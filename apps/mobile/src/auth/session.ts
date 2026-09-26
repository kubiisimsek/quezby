import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { create } from 'zustand';

import { queryClient } from '@/api/queryClient';
import { useSettings } from '@/stores/settings';
import type { Me, Ranks } from '@quezby/types';

const TOKEN_SERVICE = 'quezby.auth';
const INSTALL_KEY = 'quezby.install.v1';

/**
 * The player's session. The token lives in the keychain, not AsyncStorage:
 * a guest account has no password, so the token *is* the account — and on
 * iOS the keychain survives a reinstall, which keeps a guest's name and
 * scores with them.
 */
type SessionState = {
  token: string | null;
  user: Me | null;
  ranks: Ranks | null;
  /** False until the keychain has been read back. */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  signIn: (token: string, user: Me) => Promise<void>;
  setMe: (user: Me, ranks?: Ranks | null) => void;
  signOut: () => Promise<void>;
};

export const useSession = create<SessionState>((set, get) => ({
  token: null,
  user: null,
  ranks: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    // The install id is read with the token, so the first signed-in call already names the phone (`X-Device`).
    const [stored] = await Promise.all([
      Keychain.getGenericPassword({ service: TOKEN_SERVICE }).catch(() => false as const),
      installId().catch(() => null),
    ]);
    set({ token: stored ? stored.password : null, hydrated: true });
  },

  signIn: async (token, user) => {
    set({ token, user, ranks: null });
    await Keychain.setGenericPassword('player', token, {
      service: TOKEN_SERVICE,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
    });
  },

  setMe: (user, ranks) =>
    set((state) => ({ user, ranks: ranks === undefined ? state.ranks : ranks })),

  signOut: async () => {
    set({ token: null, user: null, ranks: null });
    queryClient.clear();
    // Whoever uses this phone next answers for themselves.
    useSettings.getState().forgetConsent();
    await Keychain.resetGenericPassword({ service: TOKEN_SERVICE }).catch(
      () => undefined,
    );
  },
}));

let knownInstall: string | null = null;

/**
 * A random id for this install, minted once: rate limiting, and the phone's
 * row in the API's device registry (`X-Device`).
 */
export async function installId(): Promise<string> {
  const existing = await AsyncStorage.getItem(INSTALL_KEY);
  if (existing) {
    knownInstall = existing;
    return existing;
  }
  const fresh = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 0x100000000)
      .toString(16)
      .padStart(8, '0'),
  ).join('');
  await AsyncStorage.setItem(INSTALL_KEY, fresh);
  knownInstall = fresh;
  return fresh;
}

/** This install's id once `installId()` has read it; null before. */
export function currentInstallId(): string | null {
  return knownInstall;
}
