import type { AdminRole, AdminRunRow, AdminRunStatus } from '@quezby/types';

/**
 * What a role may do in the panel. The API decides — every admin route says
 * the least role it takes — and the panel only hides what a role cannot use.
 */
export type Ability = 'moderate' | 'deletePlayers' | 'manageAdmins' | 'manageSystem' | 'seeIps';

const RANK: Record<AdminRole, number> = { viewer: 1, moderator: 2, owner: 3 };

const LEAST: Record<Ability, AdminRole> = {
  moderate: 'moderator',
  deletePlayers: 'owner',
  manageAdmins: 'owner',
  manageSystem: 'owner',
  seeIps: 'owner',
};

export function atLeast(role: AdminRole | null | undefined, least: AdminRole): boolean {
  return role !== null && role !== undefined && RANK[role] >= RANK[least];
}

export function can(role: AdminRole | null | undefined, ability: Ability): boolean {
  return atLeast(role, LEAST[ability]);
}

type RunState = Pick<AdminRunRow, 'status' | 'mode'>;

const REJECTABLE: AdminRunStatus[] = ['ranked', 'review', 'flagged'];

/**
 * What the API decides on a run at all, whoever asks (`ModerationService`):
 * only a run held for review can be let in; a ranked, held or flagged one can
 * be thrown out. A VS run never ranks anywhere, so there is nothing to let in
 * or throw out — the panel shows neither button for it.
 */
export function isApprovable(run: RunState): boolean {
  return run.mode !== 'vs' && run.status === 'review';
}

export function isRejectable(run: RunState): boolean {
  return run.mode !== 'vs' && REJECTABLE.includes(run.status);
}
