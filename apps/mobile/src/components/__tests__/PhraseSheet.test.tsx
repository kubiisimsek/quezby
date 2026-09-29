import { PHRASES } from '@quezby/config';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { PhraseSheet } from '@/components/PhraseSheet';
import { useLanguage } from '@/i18n/language';
import { inbox } from '@/i18n/messages/inbox';

describe('PhraseSheet', () => {
  it('lays out every phrase and sends the one pressed', async () => {
    const onSend = jest.fn();
    await render(<PhraseSheet open onClose={jest.fn()} onSend={onSend} />);

    expect(screen.getByText('Hazır mesajlar')).toBeOnTheScreen();
    for (const phrase of PHRASES) {
      expect(screen.getByRole('button', { name: `Gönder: ${inbox.tr.phrases[phrase]}` })).toBeOnTheScreen();
    }
    await fireEvent.press(screen.getByRole('button', { name: 'Gönder: EZ 😎' }));
    expect(onSend).toHaveBeenCalledWith('ez');
  });

  it('holds the phrases back while one is on its way', async () => {
    const onSend = jest.fn();
    await render(<PhraseSheet open busy onClose={jest.fn()} onSend={onSend} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Gönder: Selam! 👋' }));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('speaks the phone’s language', async () => {
    useLanguage.setState({ locale: 'en' });
    await render(<PhraseSheet open onClose={jest.fn()} onSend={jest.fn()} />);

    expect(screen.getByText('Quick messages')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Send: Rage quit! 😡' })).toBeOnTheScreen();
  });
});
