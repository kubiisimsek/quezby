import { describe, expect, it } from 'vitest';

import { atLeast, can, isApprovable, isRejectable } from '@/lib/permissions';

describe('permissions', () => {
  it('ranks the roles', () => {
    expect(atLeast('owner', 'moderator')).toBe(true);
    expect(atLeast('moderator', 'moderator')).toBe(true);
    expect(atLeast('viewer', 'moderator')).toBe(false);
    expect(atLeast(undefined, 'viewer')).toBe(false);
  });

  it('lets a moderator moderate and only an owner run the panel', () => {
    expect(can('viewer', 'moderate')).toBe(false);
    expect(can('moderator', 'moderate')).toBe(true);
    expect(can('moderator', 'deletePlayers')).toBe(false);
    expect(can('moderator', 'setRatings')).toBe(false);
    expect(can('owner', 'setRatings')).toBe(true);
    expect(can('moderator', 'manageAdmins')).toBe(false);
    expect(can('owner', 'manageSystem')).toBe(true);
    expect(can('owner', 'seeIps')).toBe(true);
  });

  it('offers a decision only on a run the API would take one on, and never on a VS run', () => {
    expect(isApprovable({ mode: 'free', status: 'review' })).toBe(true);
    expect(isApprovable({ mode: 'daily', status: 'ranked' })).toBe(false);
    expect(isRejectable({ mode: 'daily', status: 'flagged' })).toBe(true);
    expect(isRejectable({ mode: 'free', status: 'ranked' })).toBe(true);
    expect(isRejectable({ mode: 'free', status: 'rejected' })).toBe(false);
    expect(isRejectable({ mode: 'free', status: 'abandoned' })).toBe(false);

    for (const status of ['review', 'flagged', 'played', 'ranked'] as const) {
      expect(isApprovable({ mode: 'vs', status })).toBe(false);
      expect(isRejectable({ mode: 'vs', status })).toBe(false);
    }
  });
});
