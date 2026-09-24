import { fireEvent, render, screen } from '@testing-library/react-native';

import { buildEntries } from '@/test/factories';
import { BrandBand, Podium } from '@/ui/kit';

describe('Podium', () => {
  it('stands second, first and third, left to right', async () => {
    await render(
      <BrandBand>
        <Podium entries={buildEntries(3)} />
      </BrandBand>,
    );

    expect(
      screen.getAllByText(/^@/).map((node) => node.props.children),
    ).toEqual(['@mert', '@ekin', '@oya']);
    expect(
      screen.getAllByRole('image').map((node) => node.props.accessibilityLabel),
    ).toEqual(['2. sıra', '1. sıra', '3. sıra']);
  });

  it('shows each player with their score and place', async () => {
    await render(
      <Podium entries={buildEntries(3, { top: 24_000, step: 1_240 })} />,
    );

    expect(screen.getByText('24.000')).toBeOnTheScreen();
    expect(screen.getByText('22.760')).toBeOnTheScreen();
    expect(screen.getByText('21.520')).toBeOnTheScreen();
    ['1', '2', '3'].forEach((place) => {
      expect(screen.getByText(place)).toBeOnTheScreen();
    });
    expect(
      screen.getByLabelText('1. sıra, @ekin, 24.000 puan'),
    ).toBeOnTheScreen();
  });

  it('marks your own place', async () => {
    await render(<Podium entries={buildEntries(3, { me: 2 })} />);

    expect(screen.getByText('· sen')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('2. sıra, @mert, sen, 22.760 puan'),
    ).toBeOnTheScreen();
  });

  it('keeps an empty pedestal for a place nobody holds', async () => {
    await render(<Podium entries={buildEntries(1)} />);

    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByLabelText('2. sıra boş')).toBeOnTheScreen();
    expect(screen.getByLabelText('3. sıra boş')).toBeOnTheScreen();
    expect(screen.getByText('@ekin')).toBeOnTheScreen();
  });

  it('ignores rows below the podium', async () => {
    await render(<Podium entries={buildEntries(6)} />);

    expect(screen.getAllByText(/^@/)).toHaveLength(3);
    expect(screen.queryByText('@deniz')).not.toBeOnTheScreen();
  });

  it('hands back the entry that was pressed', async () => {
    const entries = buildEntries(3);
    const onPressEntry = jest.fn();
    await render(<Podium entries={entries} onPressEntry={onPressEntry} />);

    await fireEvent.press(
      screen.getByRole('button', { name: /^1\. sıra, @ekin/ }),
    );

    expect(onPressEntry).toHaveBeenCalledWith(entries[0]);
  });

  it('is not pressable without a handler, nor where a place is empty', async () => {
    await render(<Podium entries={buildEntries(1)} onPressEntry={jest.fn()} />);

    expect(screen.getAllByRole('button')).toHaveLength(1);

    await screen.rerender(<Podium entries={buildEntries(3)} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
