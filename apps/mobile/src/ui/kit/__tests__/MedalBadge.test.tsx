import { render, screen, within } from '@testing-library/react-native';

import { MedalBadge } from '@/ui/kit';
import { arena } from '@/ui/tokens';

describe('MedalBadge', () => {
  it.each([
    [1, arena.medalGold, arena.medalGoldLip],
    [2, arena.medalSilver, arena.medalSilverLip],
    [3, arena.medalBronze, arena.medalBronzeLip],
  ] as const)('shows place %i as a coin in its metal, on its rim', async (rank, metal, rim) => {
    await render(<MedalBadge rank={rank} />);

    const badge = screen.getByRole('image', { name: `${rank}. sıra` });
    expect(badge).toHaveStyle({ backgroundColor: rim, borderColor: arena.outline });
    expect(within(badge).getByTestId('medal-coin')).toHaveStyle({ backgroundColor: metal });
  });

  it('comes in three sizes', async () => {
    await render(<MedalBadge rank={1} size="sm" />);
    expect(screen.getByRole('image')).toHaveStyle({ width: 24, height: 24 });

    await screen.rerender(<MedalBadge rank={1} size="lg" />);
    expect(screen.getByRole('image')).toHaveStyle({ width: 38, height: 38 });

    await screen.rerender(<MedalBadge rank={1} />);
    expect(screen.getByRole('image')).toHaveStyle({ width: 30, height: 30 });
  });
});
