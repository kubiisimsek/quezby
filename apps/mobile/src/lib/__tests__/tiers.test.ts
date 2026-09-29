import { TIERS, tierMove } from '@/lib/tiers';

describe('tiers', () => {
  it('lists the six leagues lowest first', () => {
    expect(TIERS).toEqual(['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master']);
  });

  it('says which way a player moved between two leagues', () => {
    expect(tierMove('silver', 'gold')).toBe('up');
    expect(tierMove('diamond', 'master')).toBe('up');
    expect(tierMove('gold', 'silver')).toBe('down');
    expect(tierMove('gold', 'gold')).toBeNull();
    expect(tierMove(null, 'silver')).toBeNull();
    expect(tierMove('silver', null)).toBeNull();
  });
});
