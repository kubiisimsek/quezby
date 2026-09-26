import { act, render, screen } from '@testing-library/react-native';

import { useLanguage } from '@/i18n/language';
import { ShareGrid } from '@/ui/kit';

describe('ShareGrid', () => {
  it('sets each square of the grid in a cell of its own', async () => {
    await render(<ShareGrid grid="🟩🟩🟨🟥⬛" />);

    expect(screen.getAllByText('🟩')).toHaveLength(2);
    expect(screen.getByText('🟨')).toBeOnTheScreen();
    expect(screen.getByText('🟥')).toBeOnTheScreen();
    expect(screen.getByText('⬛')).toBeOnTheScreen();
    expect(
      screen.getByRole('image', { name: 'Sonuç tablosu: 🟩🟩🟨🟥⬛' }),
    ).toBeOnTheScreen();
  });

  it('keeps an emoji and its variation selector together', async () => {
    await render(<ShareGrid grid={'🟩⬛️'} />);

    expect(screen.getByText('⬛️')).toBeOnTheScreen();
    expect(screen.queryByText('️')).not.toBeOnTheScreen();
  });

  it('lays out one row per line, skipping blank lines and spaces', async () => {
    await render(<ShareGrid grid={'🟩🟨\n\n🟥 ⬛'} />);

    expect(screen.root?.children).toHaveLength(2);
    expect(screen.getAllByText(/^(🟩|🟨|🟥|⬛)$/u)).toHaveLength(4);
  });

  it('draws nothing for an empty grid', async () => {
    await render(<ShareGrid grid="" />);

    expect(screen.queryByRole('image')).not.toBeOnTheScreen();
    expect(screen.toJSON()).toBeNull();
  });

  it('reads the grid aloud in the player’s language, and follows a change at once', async () => {
    useLanguage.setState({ locale: 'en' });
    await render(<ShareGrid grid="🟩🟨" />);

    expect(screen.getByRole('image', { name: 'Result grid: 🟩🟨' })).toBeOnTheScreen();

    await act(async () => {
      useLanguage.setState({ locale: 'ar' });
    });
    expect(screen.getByRole('image', { name: 'جدول النتيجة: 🟩🟨' })).toBeOnTheScreen();
  });
});
