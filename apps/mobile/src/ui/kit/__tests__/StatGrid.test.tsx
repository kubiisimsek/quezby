import { render, screen } from '@testing-library/react-native';

import { StatGrid } from '@/ui/kit';
import { valueSize } from '@/ui/kit/status';
import { arena } from '@/ui/tokens';

describe('StatGrid', () => {
  it('shows every number with what it counts', async () => {
    await render(
      <StatGrid
        columns={3}
        items={[
          { label: 'Post', value: 128 },
          { label: 'İsabet', value: '%94,2', tone: 'ok' },
          { label: 'Tepki', value: '312 ms', icon: 'bolt' },
          { label: 'Kombo', value: 'x2,50' },
        ]}
      />,
    );

    ['Post', 'İsabet', 'Tepki', 'Kombo'].forEach((label) => {
      expect(screen.getByText(label)).toBeOnTheScreen();
    });
    expect(screen.getByText('128')).toBeOnTheScreen();
    expect(screen.getByText('312 ms')).toBeOnTheScreen();
    expect(screen.getByText('x2,50')).toBeOnTheScreen();
    expect(screen.getByText('%94,2')).toHaveStyle({ color: arena.okText });
  });

  it('sizes a number by its length, never by shrink-to-fit', async () => {
    await render(
      <StatGrid
        columns={3}
        items={[
          { label: 'Tur', value: 4 },
          { label: 'Post', value: '12.345' },
          { label: 'Oyun süresi', value: '12 sa 44 dk' },
        ]}
      />,
    );

    const short = screen.getByText('4');
    expect(short).toHaveStyle({ fontSize: 21, alignSelf: 'stretch', textAlign: 'center' });
    expect(short.props.adjustsFontSizeToFit).toBeFalsy();
    expect(screen.getByText('12.345')).toHaveStyle({ fontSize: 21 });
    expect(screen.getByText('12 sa 44 dk')).toHaveStyle({ fontSize: 13 });
  });

  it('steps a value down as it grows', () => {
    expect(valueSize('x1,45').fontSize).toBe(21);
    expect(valueSize('312 ms').fontSize).toBe(21);
    expect(valueSize('2 sa 1 dk').fontSize).toBe(15);
    expect(valueSize('1.204.310').fontSize).toBe(15);
    expect(valueSize('#1.204').fontSize).toBe(21);
    expect(valueSize('2 sa 14 dk').fontSize).toBe(15);
  });

  it('keeps a short last row in step with the full ones', async () => {
    await render(
      <StatGrid
        columns={3}
        items={['Post', 'İsabet', 'Tepki', 'Kombo'].map((label) => ({
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
