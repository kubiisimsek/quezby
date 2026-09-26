import type { LeagueTier } from '@quezby/types';
import { render, screen } from '@testing-library/react-native';

import { getT } from '@/i18n';
import { useLanguage } from '@/i18n/language';
import { TierBadge } from '@/ui/kit';
import { arena } from '@/ui/tokens';

const TIERS: Array<[LeagueTier, string, string]> = [
  ['bronze', 'Bronz', arena.tierBronze],
  ['silver', 'Gümüş', arena.tierSilver],
  ['gold', 'Altın', arena.tierGold],
  ['platinum', 'Platin', arena.tierPlatinum],
  ['diamond', 'Elmas', arena.tierDiamond],
];

describe('TierBadge', () => {
  it.each(TIERS)('names the %s league', async (tier, label) => {
    await render(<TierBadge tier={tier} />);

    expect(
      screen.getByRole('image', { name: `${label} lig` }),
    ).toBeOnTheScreen();
    expect(getT().tiers.names[tier]).toBe(label);
  });

  it('shows no label unless asked', async () => {
    await render(<TierBadge tier="gold" />);

    expect(screen.queryByText('Altın')).not.toBeOnTheScreen();
  });

  it.each(TIERS)(
    'writes the %s label in its tier colour',
    async (tier, label, colour) => {
      await render(<TierBadge tier={tier} size="lg" showLabel />);

      expect(screen.getByText(label)).toHaveStyle({ color: colour });
    },
  );
});

describe('TierBadge — in English', () => {
  it("names the tier and its league in the player's language", async () => {
    useLanguage.setState({ locale: 'en' });
    await render(<TierBadge tier="gold" showLabel />);

    expect(
      screen.getByRole('image', { name: 'Gold league' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Gold')).toBeOnTheScreen();
    expect(getT().tiers.names.diamond).toBe('Diamond');
  });
});
