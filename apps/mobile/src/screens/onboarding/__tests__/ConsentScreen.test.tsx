import { fireEvent, screen } from '@testing-library/react-native';

import { useSession } from '@/auth/session';
import { useLanguage } from '@/i18n/language';
import { ConsentScreen } from '@/screens/onboarding/ConsentScreen';
import { stepFor, useOnboarding } from '@/stores/onboarding';
import { useSettings } from '@/stores/settings';
import { buildMe } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('ConsentScreen', () => {
  beforeEach(() => {
    useSession.setState({ token: 'token', user: buildMe({ id: 'u1' }), ranks: null, hydrated: true });
    useOnboarding.setState({ userId: 'u1', steps: ['consent', 'notifications'], remindedFor: null, hydrated: true });
    useSettings.setState({ hydrated: true, consent: 'unasked', analytics: false });
  });

  it('asks whether the game may count how it is used, with no and yes the same size', async () => {
    await renderWithProviders(<ConsentScreen />);

    expect(screen.getByText('SENİN SEÇİMİN')).toBeTruthy();
    expect(screen.getByText('Oyunu birlikte geliştirelim mi?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'İzin verme' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'İzin ver' })).toBeTruthy();
    expect(useSettings.getState().analytics).toBe(false);
  });

  it.each([
    ['İzin ver', true],
    ['İzin verme', false],
  ])('takes "%s" for an answer and moves on to notifications', async (label, yes) => {
    await renderWithProviders(<ConsentScreen />);

    await fireEvent.press(screen.getByRole('button', { name: label }));

    expect(useSettings.getState()).toMatchObject({ analytics: yes, consent: 'pending' });
    expect(stepFor(useOnboarding.getState(), 'u1')).toBe('notifications');
  });

  it('asks in English', async () => {
    useLanguage.setState({ locale: 'en' });
    await renderWithProviders(<ConsentScreen />);

    expect(screen.getByText('Shall we improve the game together?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: "Don't allow" }));
    expect(useSettings.getState().analytics).toBe(false);
  });
});
