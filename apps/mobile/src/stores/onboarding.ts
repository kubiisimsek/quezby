import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY = 'quezby.onboarding.v1';

/** A new player's first steps, in order: the practice run, a name, a way to keep the account. */
export type OnboardingStep = 'tutorial' | 'nickname' | 'protect';

const STEPS: readonly OnboardingStep[] = ['tutorial', 'nickname', 'protect'];

type Stored = {
  /** The account the steps belong to — signing in to another leaves them behind. */
  userId: string | null;
  step: OnboardingStep | null;
  /** The account already asked, once, to keep itself when its league opened. */
  remindedFor: string | null;
};

type OnboardingState = Stored & {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** A new account starts its first steps with the practice run. */
  begin: (userId: string) => void;
  /** On to the next step; a kept account — Apple, Google or email — has no "keep it" step. */
  advance: (isGuest: boolean) => void;
  finish: () => void;
  markReminded: (userId: string) => void;
};

const EMPTY: Stored = { userId: null, step: null, remindedFor: null };

/**
 * Where a new player is in their first steps. Kept on the phone, so a player
 * who closes the app on the name question comes back to it. On iOS the
 * keychain outlives a reinstall and this does not: a returning guest goes
 * straight to the lobby.
 */
export const useOnboarding = create<OnboardingState>((set, get) => {
  const save = (next: Partial<Stored>) => {
    set(next);
    const { userId, step, remindedFor } = get();
    void AsyncStorage.setItem(KEY, JSON.stringify({ userId, step, remindedFor }));
  };

  return {
    ...EMPTY,
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

    begin: (userId) => save({ userId, step: 'tutorial' }),

    advance: (isGuest) => {
      const { step } = get();
      if (step === 'tutorial') save({ step: 'nickname' });
      else if (step === 'nickname' && isGuest) save({ step: 'protect' });
      else save({ step: null });
    },

    finish: () => save({ step: null }),

    markReminded: (userId) => save({ remindedFor: userId }),
  };
});

/** The first step `userId` is on, or null when it has none left — or they are someone else's. */
export function stepFor(
  state: Pick<Stored, 'userId' | 'step'>,
  userId: string | null | undefined,
): OnboardingStep | null {
  return userId && state.userId === userId ? state.step : null;
}

function pick(value: Partial<Stored>): Stored {
  const text = (field: unknown) => (typeof field === 'string' ? field : null);
  return {
    userId: text(value.userId),
    step: STEPS.find((step) => step === value.step) ?? null,
    remindedFor: text(value.remindedFor),
  };
}
