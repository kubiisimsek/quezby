import { render, screen } from '@testing-library/react-native';

import { UsernameField } from '@/components/UsernameField';
import type { UsernameCheck } from '@/hooks/useUsernameCheck';
import { iso } from '@/i18n';
import { useLanguage } from '@/i18n/language';

async function field(check: UsernameCheck, value = 'ekin') {
  await render(<UsernameField value={value} onChange={jest.fn()} check={check} />);
}

describe('UsernameField', () => {
  it('says what the name is for, and whose it could be', async () => {
    await field({ state: 'empty' }, '');

    expect(screen.getByLabelText('Kullanıcı adı')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('ornek.kullanici')).toBeOnTheScreen();
    expect(screen.getByText('Sıralamada herkes seni bu adla görecek.')).toBeOnTheScreen();

    await screen.rerender(
      <UsernameField value="ekin" onChange={jest.fn()} check={{ state: 'available', normalized: 'ekin' }} />,
    );
    expect(screen.getByText('@ekin senin olabilir.')).toBeOnTheScreen();
  });

  it.each([
    [{ state: 'available', normalized: 'ekin' }, '@ekin can be yours.'],
    [{ state: 'current', normalized: 'ekin' }, 'Your current name.'],
    [{ state: 'unknown', normalized: 'ekin' }, "Couldn't check availability right now; we'll try again when you save."],
    [{ state: 'empty' }, 'Everyone on the leaderboard will see you by this name.'],
  ] as [UsernameCheck, string][])('speaks English: %j', async (check, hint) => {
    useLanguage.setState({ locale: 'en' });
    await field(check);

    expect(screen.getByLabelText('Username')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('example.user')).toBeOnTheScreen();
    expect(screen.getByText(hint)).toBeOnTheScreen();
  });

  it('keeps the name whole inside an Arabic line', async () => {
    useLanguage.setState({ locale: 'ar' });
    await field({ state: 'available', normalized: 'ekin.su' });

    expect(screen.getByLabelText('اسم المستخدم')).toBeOnTheScreen();
    expect(screen.getByText(`يمكن أن يكون ${iso('@ekin.su')} لك.`)).toBeOnTheScreen();
  });
});
