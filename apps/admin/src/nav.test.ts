import { describe, expect, it } from 'vitest';

import { activeNavHref, NAV, navBadges, navFor } from '@/nav';

describe('the menu', () => {
  it('shows owners everything and hides the owner pages from everyone else', () => {
    expect(navFor('owner').map((item) => item.href)).toEqual(NAV.map((item) => item.href));
    for (const role of ['moderator', 'viewer'] as const) {
      const hrefs = navFor(role).map((item) => item.href);
      expect(hrefs).not.toContain('/admins');
      expect(hrefs).not.toContain('/system');
      expect(hrefs).toContain('/players');
    }
  });

  it('shows every role the reports, and badges what waits by the API\'s counts', () => {
    for (const role of ['owner', 'moderator', 'viewer'] as const) {
      expect(navFor(role).map((item) => item.href)).toContain('/reports');
    }
    expect(navBadges(navFor('viewer'), { review: 2, reports: 5 })).toEqual({ '/suspects': 2, '/reports': 5 });
    expect(navBadges(navFor('viewer'), undefined)).toEqual({ '/suspects': 0, '/reports': 0 });
  });

  it('keeps a list lit on its records', () => {
    const items = navFor('owner');
    expect(activeNavHref(items, '/')).toBe('/');
    expect(activeNavHref(items, '/players')).toBe('/players');
    expect(activeNavHref(items, '/players/01jplayer')).toBe('/players');
    expect(activeNavHref(items, '/playersomething')).toBeNull();
    expect(activeNavHref(items, '/account')).toBeNull();
  });
});
