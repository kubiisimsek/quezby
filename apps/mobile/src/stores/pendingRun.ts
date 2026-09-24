import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FinishRunRequest } from '@quezby/types';
import { create } from 'zustand';

const KEY = 'quezby.pendingRun.v1';

/**
 * A finished run the API has not heard about yet — the network dropped as it
 * ended. The log, with its checkpoint receipts, is kept on the phone so the
 * finish can be sent again, even after the app restarts, while the server
 * still holds the run open.
 */
export type PendingRun = FinishRunRequest & { runId: string; savedAt: number };

type PendingRunState = {
  run: PendingRun | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  keep: (run: PendingRun) => void;
  clear: () => void;
};

/** The server gives a run this long to be finished (`QUEZBY_RUN_TTL_MINUTES`). */
export const PENDING_TTL_MS = 120 * 60_000;

export const usePendingRun = create<PendingRunState>((set, get) => ({
  run: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const stored = raw ? (JSON.parse(raw) as PendingRun) : null;
      const fresh = stored && Date.now() - stored.savedAt < PENDING_TTL_MS ? stored : null;
      if (!fresh && stored) void AsyncStorage.removeItem(KEY);
      set({ run: fresh, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  keep: (run) => {
    set({ run });
    void AsyncStorage.setItem(KEY, JSON.stringify(run));
  },

  clear: () => {
    set({ run: null });
    void AsyncStorage.removeItem(KEY);
  },
}));
