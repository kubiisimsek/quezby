import { screenOf } from '@/analytics/screens';

describe('screenOf', () => {
  it.each([
    ['Welcome', 'welcome'],
    ['Tutorial', 'tutorial'],
    ['Home', 'home'],
    ['Leaderboard', 'leaderboard'],
    ['League', 'league'],
    ['Search', 'search'],
    ['Profile', 'profile'],
    ['Game', 'game'],
    ['Daily', 'daily'],
  ])('names the %s route %s', (route, screen) => {
    expect(screenOf(route)).toBe(screen);
  });

  it('names nothing it does not know', () => {
    expect(screenOf('Tabs')).toBeNull();
    expect(screenOf('toString')).toBeNull();
    expect(screenOf(undefined)).toBeNull();
  });
});
