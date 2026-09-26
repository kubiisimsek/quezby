import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useLanguage } from '@/i18n/language';
import { Button, TopBar } from '@/ui/kit';

function Wrapped(props: Parameters<typeof TopBar>[0]) {
  return (
    <SafeAreaProvider>
      <TopBar {...props} />
    </SafeAreaProvider>
  );
}

describe('TopBar', () => {
  it('names the screen, with a subtitle when given', async () => {
    await render(<Wrapped title="Arkadaşlar" subtitle="Oyuncu ara, takip et" />);

    expect(screen.getByText('Arkadaşlar')).toBeOnTheScreen();
    expect(screen.getByText('Oyuncu ara, takip et')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Geri' })).not.toBeOnTheScreen();
  });

  it('offers the way back on a pushed screen, and one action on the right', async () => {
    const back = jest.fn();
    const act = jest.fn();
    await render(
      <Wrapped title="Yardım" onBack={back} right={<Button label="Tamam" size="sm" onPress={act} />} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Geri' }));
    expect(back).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Tamam' }));
    expect(act).toHaveBeenCalledTimes(1);
  });

  it('says the way back in the player’s language, and again when it changes', async () => {
    useLanguage.setState({ locale: 'en' });
    await render(<Wrapped title="Help" onBack={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();

    await act(async () => {
      useLanguage.setState({ locale: 'ar' });
    });
    expect(screen.getByRole('button', { name: 'رجوع' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
  });
});
