import { render, screen } from '@testing-library/react-native';

import { RankChips } from '@/ui/kit';
import { arena } from '@/ui/tokens';

describe('RankChips', () => {
  it('shows each board with the rank the API sent, in gold', async () => {
    await render(
      <RankChips
        items={[
          { label: 'Bugün', rank: 44 },
          { label: 'Hafta', rank: 120 },
          { label: 'Ay', rank: 310 },
          { label: 'Tüm zamanlar', rank: 1_204 },
        ]}
      />,
    );

    ['Bugün', 'Hafta', 'Ay', 'Tüm zamanlar'].forEach((label) => {
      expect(screen.getByText(label)).toBeOnTheScreen();
    });
    expect(screen.getByText('#44')).toHaveStyle({ color: arena.gold });
    expect(screen.getByText('#1.204')).toBeOnTheScreen();
    expect(screen.getByLabelText('Tüm zamanlar: #1.204')).toBeOnTheScreen();
  });

  it('says so, quietly, where you have not placed', async () => {
    await render(
      <RankChips
        items={[
          { label: 'Bugün', rank: null },
          { label: 'Hafta', rank: undefined },
        ]}
      />,
    );

    const dashes = screen.getAllByText('—');
    expect(dashes).toHaveLength(2);
    expect(dashes[0]).toHaveStyle({ color: arena.inkFaint });
    expect(
      screen.getByLabelText('Bugün: sıralamada değilsin'),
    ).toBeOnTheScreen();
  });
});
