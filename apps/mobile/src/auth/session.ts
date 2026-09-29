import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { create } from 'zustand';

import { queryClient } from '@/api/queryClient';
import { useSettings } from '@/stores/settings';
import type { Me, Ranks } from '@quezby/types';

const TOKEN_SERVICE = 'quezby.auth';
const INSTALL_KEY = 'quezby.install.v1';
/** A token saved before tokens named their install (2026-09-29). */
const LEGACY_ACCOUNT = 'player';
/** Kept in the keychain before 2026-09-29; the App Attest key id now lives with the install. */
const LEGACY_SERVICES = ['quezby.appattest'];

/**
 * The player's session. The keychain holds one thing: the token, filed under
 * the id of the install that signed in. Everything else lives in AsyncStorage,
 * which goes with the app. The keychain does not — on iOS it outlives
 * deleting the app — so a new install clears it before anything reads it
 * (`installId`), and a token filed under another install is never used.
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

/** The last token being written to the keychain. */
let saving: Promise<unknown> = Promise.resolve();

/**
 * Settles once the token of the last sign-in is in the keychain — before
 * anything reloads the app (a language that reads the other way): Android
 * starts the process over, and a token still on its way would be lost.
 */
export function sessionSaved(): Promise<void> {
  return saving.then(
    () => undefined,
    () => undefined,
  );
}

export const useSession = create<SessionState>((set, get) => ({
  token: null,
  user: null,
  ranks: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    // The install comes first: a new one clears the keychain, and the first signed-in call names the phone (`X-Device`).
    const install = await installId().catch(() => null);
    set({ token: install ? await readToken(install) : null, hydrated: true });
  },

  signIn: async (token, user) => {
    set({ token, user, ranks: null });
    saving = installId().then((install) => saveToken(token, install));
    await saving;
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

function saveToken(token: string, install: string) {
  return Keychain.setGenericPassword(install, token, {
    service: TOKEN_SERVICE,
    // Never in a backup: a restored phone signs in again.
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}

/** This install's token, or null — a token another install left behind is deleted. */
async function readToken(install: string): Promise<string | null> {
  const stored = await Keychain.getGenericPassword({ service: TOKEN_SERVICE }).catch(
    () => false as const,
  );
  if (!stored) return null;
  if (stored.username === install) return stored.password;
  // A new install has cleared these already: one left here was saved by this install before tokens named it.
  if (stored.username === LEGACY_ACCOUNT) {
    await saveToken(stored.password, install).catch(() => undefined);
    return stored.password;
  }
  await Keychain.resetGenericPassword({ service: TOKEN_SERVICE }).catch(() => undefined);
  return null;
}

let knownInstall: string | null = null;
let opening: Promise<string> | null = null;

/**
 * A random id for this install, minted on its first launch and kept in
 * AsyncStorage until the app is deleted: rate limiting, the phone's row in
 * the API's device registry (`X-Device`), and the mark that tells a new
 * install from an old one. No id on disk means a new install — or the app
 * deleted and installed again — so whatever is still in the keychain belongs
 * to the install before and goes first.
 */
export function installId(): Promise<string> {
  opening ??= openInstall().finally(() => {
    opening = null;
  });
  return opening;
}

async function openInstall(): Promise<string> {
  const existing = await AsyncStorage.getItem(INSTALL_KEY);
  if (existing) {
    knownInstall = existing;
    return existing;
  }
  await Promise.all(
    [TOKEN_SERVICE, ...LEGACY_SERVICES].map((service) =>
      Keychain.resetGenericPassword({ service }).catch(() => undefined),
    ),
  );
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
