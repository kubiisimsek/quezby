import AsyncStorage from '@react-native-async-storage/async-storage';
import { ANALYTICS } from '@quezby/config';
import { create } from 'zustand';

import { closeVisit, type ClosedVisit, type OpenVisit } from '@/analytics/visit';

const KEY = 'quezby.visits.v1';

/** Changes to the open visit reach storage at most this often; closing, pausing and sending save at once. */
const SAVE_EVERY_MS = 5_000;

type Stored = {
  /** The visit being recorded, if any. */
  current: OpenVisit | null;
  /** Finished visits the API has not taken yet, oldest first. */
  outbox: ClosedVisit[];
  /** Nothing is recorded before this: the API said to keep nothing for a while. */
  pausedUntil: number;
};

type VisitsState = Stored & {
  hydrated: boolean;
  /** No send before this: the last one failed on the way. Not kept across launches. */
  nextTryAt: number;
  /** Reads what the last launch left: a visit it never closed is closed where it stopped. */
  hydrate: (now?: number) => Promise<void>;
  begin: (visit: OpenVisit) => void;
  /** Changes the visit being recorded; nothing without one. */
  update: (change: (visit: OpenVisit) => OpenVisit) => void;
  /** Ends the visit being recorded: it waits to be sent. */
  finish: (now: number) => void;
  /** Visits the API has, or will never take. */
  drop: (ids: readonly string[]) => void;
  retryAt: (at: number) => void;
  /** The API keeps nothing of this player for now: record nothing, send nothing. */
  pause: (until: number) => void;
  /** The player said no, or left: nothing recorded or waiting stays. */
  forget: () => void;
  save: () => void;
};

let savedAt = 0;

export const useVisits = create<VisitsState>((set, get) => {
  const write = () => {
    savedAt = Date.now();
    const { current, outbox, pausedUntil } = get();
    void AsyncStorage.setItem(KEY, JSON.stringify({ current, outbox, pausedUntil })).catch(() => undefined);
  };

  return {
    current: null,
    outbox: [],
    pausedUntil: 0,
    hydrated: false,
    nextTryAt: 0,

    hydrate: async (now = Date.now()) => {
      if (get().hydrated) return;
      try {
        const raw = await AsyncStorage.getItem(KEY);
        const stored = raw ? (JSON.parse(raw) as Partial<Stored>) : {};
        const left = isOpenVisit(stored.current) ? closeVisit(stored.current, stored.current.touchedAt) : null;
        set({
          current: null,
          outbox: keep([...(Array.isArray(stored.outbox) ? stored.outbox.filter(isClosedVisit) : []), ...(left ? [left] : [])], now),
          pausedUntil: typeof stored.pausedUntil === 'number' ? stored.pausedUntil : 0,
          hydrated: true,
        });
        write();
      } catch {
        set({ hydrated: true });
      }
    },

    begin: (visit) => {
      set({ current: visit });
      write();
    },

    update: (change) => {
      const { current } = get();
      if (!current) return;
      set({ current: change(current) });
      if (Date.now() - savedAt >= SAVE_EVERY_MS) write();
    },

    finish: (now) => {
      const { current, outbox } = get();
      if (!current) return;
      const closed = closeVisit(current, now);
      set({ current: null, outbox: closed ? keep([...outbox, closed], now) : outbox });
      write();
    },

    drop: (ids) => {
      set({ outbox: get().outbox.filter((closed) => !ids.includes(closed.visit.id)) });
      write();
    },

    retryAt: (at) => set({ nextTryAt: at }),

    pause: (until) => {
      set({ current: null, outbox: [], pausedUntil: until });
      write();
    },

    forget: () => {
      set({ current: null, outbox: [] });
      write();
    },

    save: write,
  };
});

/** The newest few, none older than the API would take. */
function keep(outbox: ClosedVisit[], now: number): ClosedVisit[] {
  const oldest = now - ANALYTICS.maxAgeDays * 86_400_000;
  return outbox.filter((closed) => closed.endedAt >= oldest).slice(-ANALYTICS.outbox);
}

function isOpenVisit(value: unknown): value is OpenVisit {
  const visit = value as Partial<OpenVisit> | null | undefined;
  return (
    typeof visit?.id === 'string' &&
    typeof visit.startedAt === 'number' &&
    typeof visit.touchedAt === 'number' &&
    typeof visit.activeMs === 'number' &&
    Array.isArray(visit.journey) &&
    typeof visit.counts === 'object' &&
    visit.counts !== null
  );
}

function isClosedVisit(value: unknown): value is ClosedVisit {
  const closed = value as Partial<ClosedVisit> | null | undefined;
  return typeof closed?.endedAt === 'number' && typeof closed.visit?.id === 'string';
}
