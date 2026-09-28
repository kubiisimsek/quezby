import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PushData } from '@quezby/types';
import { create } from 'zustand';

import type { PushNotice, PushPermission } from '@/lib/push';

const KEY = 'quezby.push.v1';

/** How long "Gizle" puts the notifications card away for. */
export const NUDGE_REST_MS = 7 * 24 * 60 * 60 * 1000;

type Stored = {
  /**
   * Android turned the question down for good ("don't ask again"): Android
   * tells that only when asked, so the phone remembers it — until
   * notifications are on again.
   */
  androidBlocked: boolean;
  /** When the notifications card may show again after "Gizle"; 0 for now. */
  nudgeHiddenUntil: number;
};

type PushState = Stored & {
  hydrated: boolean;
  /** Where the phone stands; null until it was looked at. */
  permission: PushPermission | null;
  /** The token the API holds for the signed-in account. */
  token: string | null;
  /** A notification that came while the game was open, shown over it. */
  notice: PushNotice | null;
  /** A tapped notification, waiting for the game to be ready to open it. */
  opened: PushData | null;
  hydrate: () => Promise<void>;
  setPermission: (permission: PushPermission) => void;
  setAndroidBlocked: (blocked: boolean) => void;
  setToken: (token: string | null) => void;
  show: (notice: PushNotice) => void;
  hide: () => void;
  open: (data: PushData) => void;
  consumed: () => void;
  /** "Gizle": the card rests for `NUDGE_REST_MS`. */
  hideNudge: (now?: number) => void;
};

/**
 * Push notifications on this phone: the permission, the token the API
 * holds, what arrives while the game is open and a tap waiting to be opened
 * — and, kept across launches, a question Android will not ask again and a
 * notifications card put away for a while.
 */
export const usePush = create<PushState>((set, get) => {
  const save = (next: Partial<Stored>) => {
    set(next);
    const { androidBlocked, nudgeHiddenUntil } = get();
    void AsyncStorage.setItem(KEY, JSON.stringify({ androidBlocked, nudgeHiddenUntil }));
  };

  return {
    androidBlocked: false,
    nudgeHiddenUntil: 0,
    hydrated: false,
    permission: null,
    token: null,
    notice: null,
    opened: null,

    hydrate: async () => {
      if (get().hydrated) return;
      try {
        const raw = await AsyncStorage.getItem(KEY);
        const stored = raw ? (JSON.parse(raw) as Partial<Stored>) : {};
        set({
          androidBlocked: stored.androidBlocked === true,
          nudgeHiddenUntil: typeof stored.nudgeHiddenUntil === 'number' ? stored.nudgeHiddenUntil : 0,
          hydrated: true,
        });
      } catch {
        set({ hydrated: true });
      }
    },

    setPermission: (permission) => set({ permission }),
    setAndroidBlocked: (blocked) => {
      if (get().androidBlocked !== blocked) save({ androidBlocked: blocked });
    },
    setToken: (token) => set({ token }),
    show: (notice) => set({ notice }),
    hide: () => set({ notice: null }),
    open: (data) => set({ opened: data }),
    consumed: () => set({ opened: null }),
    hideNudge: (now = Date.now()) => save({ nudgeHiddenUntil: now + NUDGE_REST_MS }),
  };
});
