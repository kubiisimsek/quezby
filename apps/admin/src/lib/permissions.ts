import type { AdminRole } from '@quezby/types';

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
