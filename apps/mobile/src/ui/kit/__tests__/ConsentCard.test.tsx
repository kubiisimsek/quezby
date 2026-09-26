import { fireEvent, render, screen } from '@testing-library/react-native';

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
});
