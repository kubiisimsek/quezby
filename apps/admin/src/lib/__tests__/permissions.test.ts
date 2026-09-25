import { describe, expect, it } from 'vitest';

import { atLeast, can } from '@/lib/permissions';

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
    expect(can('moderator', 'manageAdmins')).toBe(false);
    expect(can('owner', 'manageSystem')).toBe(true);
    expect(can('owner', 'seeIps')).toBe(true);
  });
});
