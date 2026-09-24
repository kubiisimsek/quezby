import { fireEvent, render, screen } from '@testing-library/react-native';

import { LobbyCard, Txt } from '@/ui/kit';

describe('LobbyCard', () => {
  it('shows its eyebrow, title, live state and body', async () => {
    await render(
      <LobbyCard
        title="Günün akışı"
        eyebrow="Herkese aynı reeller"
        icon="calendar"
        right={<Txt variant="meta">Yeni</Txt>}
      >
        <Txt>Bugün tek hakkın var.</Txt>
      </LobbyCard>,
    );

    expect(screen.getByText('Günün akışı')).toBeOnTheScreen();
    expect(screen.getByText('Herkese aynı reeller')).toBeOnTheScreen();
    expect(screen.getByText('Yeni')).toBeOnTheScreen();
    expect(screen.getByText('Bugün tek hakkın var.')).toBeOnTheScreen();
  });

  it('is a button when it leads somewhere', async () => {
    const onPress = jest.fn();
    await render(<LobbyCard title="Lig" icon="trophy" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: /Lig/ }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('only displays when it does not', async () => {
    await render(<LobbyCard title="Lig" />);

    expect(screen.getByText('Lig')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });
});
