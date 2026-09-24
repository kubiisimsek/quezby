import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DeviceCheckResponse, DeviceVerdict } from '@quezby/types';
import { create } from 'zustand';

const KEY = 'quezby.deviceVerdict.v1';

/**
 * The API's last verdict on this phone, for the player it was asked for.
 * The API keeps its own copy — that is the one a run is judged by — so this
 * is only what the app shows (the lobby's warning) and when it asks again.
 * Kept across launches: a check is made per phone at intervals, not per
 * launch (Google's daily quota, the API's load).
 */
type DeviceVerdictState = {
  userId: string | null;
  verdict: DeviceVerdict | null;
  /** When the API stops counting this verdict; the app asks again before it. */
  validUntil: string | null;
  /** Whether a `fail` keeps runs off the boards right now (false while the API only records). */
  enforced: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  record: (userId: string, answer: DeviceCheckResponse) => void;
};

type Stored = Pick<DeviceVerdictState, 'userId' | 'verdict' | 'validUntil' | 'enforced'>;

const EMPTY: Stored = { userId: null, verdict: null, validUntil: null, enforced: false };

const VERDICTS: readonly DeviceVerdict[] = ['pass', 'fail', 'unavailable'];

function readStored(raw: string | null): Stored {
  if (!raw) return EMPTY;
  const value = JSON.parse(raw) as Partial<Record<keyof Stored, unknown>>;
  const verdict = VERDICTS.find((known) => known === value.verdict) ?? null;
  if (
    typeof value.userId !== 'string' ||
    verdict === null ||
    typeof value.validUntil !== 'string'
  ) {
    return EMPTY;
  }
  return {
    userId: value.userId,
    verdict,
    validUntil: value.validUntil,
    enforced: value.enforced === true,
  };
}

export const useDeviceVerdict = create<DeviceVerdictState>((set, get) => ({
  ...EMPTY,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      set({ ...readStored(await AsyncStorage.getItem(KEY)), hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  record: (userId, answer) => {
    const next: Stored = {
      userId,
      verdict: answer.verdict,
      validUntil: answer.validUntil,
      enforced: answer.enforced,
    };
    set(next);
    void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
  },
}));

/**
 * The lobby's question: did the API's check come back against this phone,
 * for this player, does that verdict still stand — and does the API act on it?
 * While it only records verdicts (local, staging) nothing is kept off the
 * boards, so the lobby must not say otherwise.
 */
export function deviceFailed(state: Stored, userId: string | null, now = Date.now()): boolean {
  if (
    !userId ||
    state.userId !== userId ||
    state.verdict !== 'fail' ||
    !state.enforced ||
    !state.validUntil
  ) {
    return false;
  }
  const until = Date.parse(state.validUntil);
  return Number.isFinite(until) && until > now;
}
