import type { UsernameProblem } from '@quezby/config';
import { ApiError } from '@quezby/sdk';

import { getT, type Messages } from '@/i18n';

/**
 * What went wrong — what happened, then what to do — in the player's
 * language. Every API code has its own line; only `validation_failed` shows
 * the API's message, which comes back in the language the request asked for.
 */
export function messageFor(error: unknown, t: Messages = getT()): string {
  if (!(error instanceof ApiError)) return t.errors.unknown;
  switch (error.code) {
    case 'network':
      return t.errors.network;
    case 'timeout':
      return t.errors.timeout;
    case 'username_taken':
      return t.usernameRules.taken;
    case 'username_invalid': {
      const problem = error.fields.username?.[0] as UsernameProblem | undefined;
      return (problem && t.usernameRules.problems[problem]) || t.errors.codes.username_invalid;
    }
    case 'validation_failed':
      return error.message || t.errors.codes.validation_failed;
    default:
      return t.errors.codes[error.code] ?? t.errors.unknown;
  }
}

/** Why a name is refused, in the player's language — a code the rules or the API gave. */
export function usernameMessage(problem: string | null | undefined, t: Messages = getT()): string {
  if (problem === 'taken') return t.usernameRules.taken;
  return (
    (problem && t.usernameRules.problems[problem as UsernameProblem]) ||
    t.errors.codes.username_invalid
  );
}
