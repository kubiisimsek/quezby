import AsyncStorage from '@react-native-async-storage/async-storage';
import { canPickUsername } from '@quezby/config';
import type { Me } from '@quezby/types';
import { create } from 'zustand';

import { useSettings } from '@/stores/settings';

const KEY = 'quezby.onboarding.v1';

/**
 * What a phone with no account shows, in order: the welcome, the practice
 * run, then the ways in — Apple, Google, an email, or as a guest.
 */
export type IntroStep = 'welcome' | 'tutorial' | 'account';

/**
 * An account's first steps once it is in, in order: its name — only when it
 * signed in and still plays under the automatic one — whether the game may
 * count how it is used, whether it may send notifications.
 */
export type OnboardingStep = 'username' | 'consent' | 'notifications';

const STEPS: readonly OnboardingStep[] = ['username', 'consent', 'notifications'];

type Stored = {
  /** The practice run is behind this install: the welcome and the run are not shown again. */
  practiced: boolean;
  /** The account the steps belong to — signing in to another leaves them behind. */
  userId: string | null;
  /** Its steps still to come. */
  steps: OnboardingStep[];
  /** The account already asked, once, to keep itself when its league opened. */
  remindedFor: string | null;
};

type OnboardingState = Stored & {
  /** The welcome's Oyna was pressed and the practice run is on. Not kept: a restart shows the welcome again. */
  playing: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** The welcome's Oyna: on to the practice run. */
  play: () => void;
  /** The practice run is over: on to the ways in. */
  practiceDone: () => void;
  /**
   * An account came in on this phone: its first steps begin. `signedIn` —
   * Apple, Google or an email — is asked for a name; a guest keeps its
   * automatic one until it picks one on the profile.
   */
  begin: (user: Pick<Me, 'id' | 'username' | 'settings'>, signedIn: boolean) => void;
  /** On to the next step. */
  advance: () => void;
  finish: () => void;
  markReminded: (userId: string) => void;
};

const EMPTY: Stored = { practiced: false, userId: null, steps: [], remindedFor: null };

/**
 * Where a new player is in their first steps. Kept on the phone and gone
 * with the app: a player who closes it on the name question comes back to
 * it, and a reinstall starts at the welcome again.
 */
export const useOnboarding = create<OnboardingState>((set, get) => {
  const save = (next: Partial<Stored>) => {
    set(next);
    const { practiced, userId, steps, remindedFor } = get();
    void AsyncStorage.setItem(KEY, JSON.stringify({ practiced, userId, steps, remindedFor }));
  };

  return {
    ...EMPTY,
    playing: false,
    hydrated: false,

    hydrate: async () => {
      if (get().hydrated) return;
      try {
        const raw = await AsyncStorage.getItem(KEY);
        set({ ...(raw ? pick(JSON.parse(raw) as Partial<Stored>) : EMPTY), hydrated: true });
      } catch {
        set({ hydrated: true });
      }
    },

    play: () => set({ playing: true }),

    practiceDone: () => {
      set({ playing: false });
      save({ practiced: true });
    },

    begin: (user, signedIn) => {
      const consentAsked = useSettings.getState().consent !== 'unasked';
      save({ practiced: true, userId: user.id, steps: firstSteps(user, { signedIn, consentAsked }) });
    },

    advance: () => save({ steps: get().steps.slice(1) }),

    finish: () => save({ steps: [] }),

    markReminded: (userId) => save({ remindedFor: userId }),
  };
});

/**
 * The steps an account that just came in goes through: a name when it signed
 * in and still has the automatic one; the usage question unless it was
 * answered here already or the account said yes on another phone; the
 * notifications question, which passes over itself when the phone was asked.
 */
export function firstSteps(
  user: Pick<Me, 'username' | 'settings'>,
  { signedIn, consentAsked }: { signedIn: boolean; consentAsked: boolean },
): OnboardingStep[] {
  return [
    ...(signedIn && canPickUsername(user.username) ? (['username'] as const) : []),
    ...(consentAsked || user.settings.analytics ? [] : (['consent'] as const)),
    'notifications',
  ];
}

/** The step `userId` is on, or null when it has none left — or they are someone else's. */
export function stepFor(
  state: Pick<Stored, 'userId' | 'steps'>,
  userId: string | null | undefined,
): OnboardingStep | null {
  return userId && state.userId === userId ? (state.steps[0] ?? null) : null;
}

function pick(value: Partial<Stored>): Stored {
  const text = (field: unknown) => (typeof field === 'string' ? field : null);
  const steps: unknown[] = Array.isArray(value.steps) ? value.steps : [];
  return {
    // Kept before the practice run came first (2026-09-29): that phone had an account already.
    practiced: typeof value.practiced === 'boolean' ? value.practiced : true,
    userId: text(value.userId),
    steps: STEPS.filter((step) => steps.includes(step)),
    remindedFor: text(value.remindedFor),
  };
}
