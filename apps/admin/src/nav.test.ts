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

  it('shows the push page to an owner only, among the players', () => {
    expect(navFor('owner').map((item) => item.href)).toContain('/push');
    expect(navFor('moderator').map((item) => item.href)).not.toContain('/push');
    expect(navFor('viewer').map((item) => item.href)).not.toContain('/push');
    expect(NAV.find((item) => item.href === '/push')).toMatchObject({ label: 'Push bildirimi', section: 'Oyuncular' });
  });

  it('shows the logs to owners and moderators, never to a viewer', () => {
    expect(navFor('owner').map((item) => item.href)).toContain('/logs');
    expect(navFor('moderator').map((item) => item.href)).toContain('/logs');
    expect(navFor('viewer').map((item) => item.href)).not.toContain('/logs');
    expect(NAV.find((item) => item.href === '/logs')).toMatchObject({ label: 'Loglar', section: 'Yönetim' });
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

  it('puts the ratings in the game section after the boards and the daily, with no weekly leagues, for every role', () => {
    for (const role of ['owner', 'moderator', 'viewer'] as const) {
      const hrefs = navFor(role).map((item) => item.href);
      expect(hrefs.slice(hrefs.indexOf('/boards'), hrefs.indexOf('/boards') + 3)).toEqual(['/boards', '/daily', '/ratings']);
      expect(hrefs).not.toContain('/leagues');
    }
    expect(NAV.find((item) => item.href === '/ratings')).toMatchObject({ label: 'Reytingler', section: 'Oyun' });
  });
});
