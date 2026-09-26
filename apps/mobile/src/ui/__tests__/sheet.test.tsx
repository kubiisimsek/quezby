import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useLanguage } from '@/i18n/language';
import { Txt } from '@/ui/kit';
import { FormSheet } from '@/ui/sheet';

function Form({ onClose = jest.fn(), onSubmit = jest.fn() }) {
  return (
    <SafeAreaProvider>
      <FormSheet open title="Adını seç" onClose={onClose} onSubmit={onSubmit}>
        <Txt>Bir ad yaz</Txt>
      </FormSheet>
    </SafeAreaProvider>
  );
}

describe('FormSheet', () => {
  it('saves with "Kaydet" unless told otherwise, and closes from the scrim or its button', async () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn();
    await render(<Form onClose={onClose} onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    const closers = screen.getAllByRole('button', { name: 'Kapat' });
    expect(closers).toHaveLength(2);
    for (const closer of closers) await fireEvent.press(closer);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('speaks the player’s language', async () => {
    useLanguage.setState({ locale: 'es' });
    await render(<Form />);

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: 'Cerrar' })).toHaveLength(2);
  });
});
