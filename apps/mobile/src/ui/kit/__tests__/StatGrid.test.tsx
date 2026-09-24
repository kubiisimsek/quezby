import { render, screen } from '@testing-library/react-native';

import { StatGrid } from '@/ui/kit';
import { arena } from '@/ui/tokens';

describe('StatGrid', () => {
  it('shows every number with what it counts', async () => {
    await render(
      <StatGrid
        columns={3}
        items={[
          { label: 'Reel', value: 128 },
          { label: 'İsabet', value: '%94,2', tone: 'ok' },
          { label: 'Tepki', value: '312 ms', icon: 'bolt' },
          { label: 'Kombo', value: 'x2,50' },
        ]}
      />,
    );

    ['Reel', 'İsabet', 'Tepki', 'Kombo'].forEach((label) => {
      expect(screen.getByText(label)).toBeOnTheScreen();
    });
    expect(screen.getByText('128')).toBeOnTheScreen();
    expect(screen.getByText('312 ms')).toBeOnTheScreen();
    expect(screen.getByText('x2,50')).toBeOnTheScreen();
    expect(screen.getByText('%94,2')).toHaveStyle({ color: arena.okText });
  });

  it('keeps a short last row in step with the full ones', async () => {
    await render(
      <StatGrid
        columns={3}
        items={['Reel', 'İsabet', 'Tepki', 'Kombo'].map((label) => ({
          label,
          value: 1,
        }))}
      />,
    );

    const rows = screen.root?.children ?? [];
    expect(rows).toHaveLength(2);
    const last = rows[1];
    expect(typeof last === 'string' ? null : last?.children).toHaveLength(3);
  });

  it('draws nothing with nothing to show', async () => {
    await render(<StatGrid items={[]} />);

    expect(screen.toJSON()).toBeNull();
  });
});
