import { fireEvent, render, screen } from '@testing-library/react-native';

import { iso } from '@/i18n';
import { useLanguage } from '@/i18n/language';
import { Button, PlayerRow } from '@/ui/kit';

describe('PlayerRow', () => {
  it('shows who the player is, their league and their season best', async () => {
    await render(<PlayerRow username="ekin" tier="gold" best={41_200} />);

    expect(screen.getByText('@ekin')).toBeOnTheScreen();
    expect(screen.getByText('Altın')).toBeOnTheScreen();
    expect(screen.getByText('Sezon rekoru 41.200')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('@ekin, Altın lig, Sezon rekoru 41.200'),
    ).toBeOnTheScreen();
  });

  it('shows the player in their league frame', async () => {
    await render(<PlayerRow username="ekin" tier="gold" best={41_200} />);

    // The row's portrait, and the league badge beside the record.
    expect(screen.getAllByTestId('league-frame-gold', { includeHiddenElements: true })).toHaveLength(2);
  });

  it('says when there is no league or record yet, and draws no frame', async () => {
    await render(<PlayerRow username="oya" tier={null} best={null} />);

    expect(screen.getByText('Henüz rekor yok')).toBeOnTheScreen();
    expect(screen.queryByRole('image')).not.toBeOnTheScreen();
    expect(screen.queryByTestId(/^league-frame-/, { includeHiddenElements: true })).not.toBeOnTheScreen();
  });

  it('opens the card from the player and acts from the button, separately', async () => {
    const onPress = jest.fn();
    const onFollow = jest.fn();
    await render(
      <PlayerRow
        username="ekin"
        tier="gold"
        best={41_200}
        onPress={onPress}
        action={<Button label="Takip et" size="sm" onPress={onFollow} />}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Takip et' }));
    expect(onFollow).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: /@ekin/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('marks your own row', async () => {
    await render(<PlayerRow username="ekin" tier={null} best={10} isMe />);

    expect(screen.getByText('@ekin · sen')).toBeOnTheScreen();
  });

  it('reads out in English, numbers grouped the English way', async () => {
    useLanguage.setState({ locale: 'en' });
    await render(<PlayerRow username="ekin" tier="gold" best={41_200} isMe />);

    expect(screen.getByText('@ekin · you')).toBeOnTheScreen();
    expect(screen.getByText('Season record 41,200')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('@ekin, you, Gold league, Season record 41,200'),
    ).toBeOnTheScreen();
  });

  it('reads out in Arabic, the name kept whole and the pieces joined the Arabic way', async () => {
    useLanguage.setState({ locale: 'ar' });
    await render(<PlayerRow username="oya" tier="silver" best={null} />);

    expect(screen.getByText('لا رقم قياسي بعد')).toBeOnTheScreen();
    expect(
      screen.getByLabelText(`${iso('@oya')}، دوري الفضة، لا رقم قياسي بعد`),
    ).toBeOnTheScreen();
  });
});
