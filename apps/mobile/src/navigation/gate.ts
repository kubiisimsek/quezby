import type { Me } from '@quezby/types';

import { stepFor, type OnboardingStep } from '@/stores/onboarding';

/**
 * What the app shows at the top, in order: a build the API no longer takes →
 * the update screen; storage not read yet, or the account on its way → the
 * splash; the account could not be fetched → "Bağlanamadık"; no account →
 * the welcome; a new account's first steps (practice run, name, keeping the
 * account); an account from before automatic names, with none → the name
 * question; otherwise the game.
 */
export type Gate =
  | 'update'
  | 'splash'
  | 'offline'
  | 'welcome'
  | OnboardingStep
  | 'username'
  | 'game';

export function gateFor({
  updateRequired,
  hydrated,
  token,
  user,
  meFailed,
  onboarding,
}: {
  updateRequired: boolean;
  /** The keychain and the onboarding steps have both been read back. */
  hydrated: boolean;
  token: string | null;
  user: Me | null;
  meFailed: boolean;
  onboarding: { userId: string | null; step: OnboardingStep | null };
}): Gate {
  if (updateRequired) return 'update';
  if (!hydrated || (token && !user && !meFailed)) return 'splash';
  if (token && !user) return 'offline';
  if (!token || !user) return 'welcome';
  const step = stepFor(onboarding, user.id);
  if (step) return step;
  if (!user.username) return 'username';
  return 'game';
}
