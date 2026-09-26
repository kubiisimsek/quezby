import { fireEvent, screen } from '@testing-library/react-native';
import { I18nManager } from 'react-native';
import RNRestart from 'react-native-restart';

import { LanguageSheet } from '@/components/LanguageSheet';
import { useLanguage } from '@/i18n/language';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('LanguageSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(I18nManager, 'allowRTL').mockImplementation(() => undefined);
    jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => undefined);
    useLanguage.setState({ phase: 'ready', locale: 'tr' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lists the six languages in their own words, with their names in the one on screen', async () => {
    await renderWithProviders(<LanguageSheet open onClose={() => undefined} />);

    expect(screen.getByText('Dil')).toBeOnTheScreen();
    for (const name of ['Türkçe', 'English', 'Deutsch', 'العربية', 'Français', 'Español']) {
      expect(screen.getByText(name)).toBeOnTheScreen();
    }
    expect(screen.getByText('Almanca')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Türkçe' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Deutsch, Almanca' })).not.toBeChecked();
  });

  it('changes at once to a language read the same way, and speaks it', async () => {
    await renderWithProviders(<LanguageSheet open onClose={() => undefined} />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Deutsch, Almanca' }));

    expect(await screen.findByText('Sprache')).toBeOnTheScreen();
    expect(useLanguage.getState().locale).toBe('de');
    expect(RNRestart.restart).not.toHaveBeenCalled();
  });

  it('asks before Arabic, which reloads the game to read right to left', async () => {
    await renderWithProviders(<LanguageSheet open onClose={() => undefined} />);

    await fireEvent.press(screen.getByRole('radio', { name: 'العربية, Arapça' }));

    expect(screen.getByText('Oyun Arapça için kapanıp yeniden açılır.')).toBeOnTheScreen();
    expect(RNRestart.restart).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Yeniden başlat'));

    expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);
    expect(RNRestart.restart).toHaveBeenCalledTimes(1);
  });

  it('goes back to the list when the player changes their mind', async () => {
    await renderWithProviders(<LanguageSheet open onClose={() => undefined} />);

    await fireEvent.press(screen.getByRole('radio', { name: 'العربية, Arapça' }));
    await fireEvent.press(screen.getByText('Vazgeç'));

    expect(screen.getByText('Deutsch')).toBeOnTheScreen();
    expect(useLanguage.getState().locale).toBe('tr');
  });
});
