import { fireEvent, render, screen } from '@testing-library/react-native';

import { useLanguage } from '@/i18n/language';
import { ConsentCard } from '@/ui/kit';

describe('ConsentCard', () => {
  it('asks, says what is counted and what never is, and where to change it', async () => {
    await render(<ConsentCard onAnswer={jest.fn()} />);

    expect(screen.getByText('SENİN SEÇİMİN')).toBeOnTheScreen();
    expect(screen.getByText('Oyunu birlikte geliştirelim mi?')).toBeOnTheScreen();
    expect(screen.getByText(/hangi ekranlara girdiğini ve ne kadar oynadığını sayarız/)).toBeOnTheScreen();
    expect(screen.getByText(/Adın, e-postan ya da konumun gönderilmez/)).toBeOnTheScreen();
    expect(screen.getByText('Kararını Ayarlar’dan istediğin zaman değiştirirsin.')).toBeOnTheScreen();
  });

  it.each([
    ['İzin ver', true],
    ['İzin verme', false],
  ])('answers %s', async (label, yes) => {
    const onAnswer = jest.fn();
    await render(<ConsentCard onAnswer={onAnswer} />);

    await fireEvent.press(screen.getByRole('button', { name: label }));

    expect(onAnswer).toHaveBeenCalledWith(yes);
  });

  it('asks in English, and never says "tracking"', async () => {
    useLanguage.setState({ locale: 'en' });
    const onAnswer = jest.fn();
    await render(<ConsentCard onAnswer={onAnswer} />);

    expect(screen.getByText('YOUR CHOICE')).toBeOnTheScreen();
    expect(screen.getByText('Shall we improve the game together?')).toBeOnTheScreen();
    expect(screen.getByText(/we count which screens you open and how long you play/)).toBeOnTheScreen();
    expect(screen.getByText(/Your name, email and location are never sent\./)).toBeOnTheScreen();
    expect(screen.getByText('You can change your mind anytime in Settings.')).toBeOnTheScreen();
    expect(screen.queryByText(/track/i)).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Allow' }));

    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('asks in Arabic, and takes no for an answer', async () => {
    useLanguage.setState({ locale: 'ar' });
    const onAnswer = jest.fn();
    await render(<ConsentCard onAnswer={onAnswer} />);

    expect(screen.getByText('اختيارك')).toBeOnTheScreen();
    expect(screen.getByText('هل نطوّر اللعبة معًا؟')).toBeOnTheScreen();
    expect(screen.getByText('يمكنك تغيير قرارك في أي وقت من الإعدادات.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'السماح' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'عدم السماح' }));

    expect(onAnswer).toHaveBeenCalledWith(false);
  });
});
