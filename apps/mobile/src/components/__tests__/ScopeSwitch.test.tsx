import { fireEvent, render, screen } from '@testing-library/react-native';

import { ScopeSwitch } from '@/components/ScopeSwitch';
import { useLanguage } from '@/i18n/language';

describe('ScopeSwitch', () => {
  it('offers everyone and friends, with the chosen side selected', async () => {
    await render(<ScopeSwitch value="everyone" onChange={jest.fn()} />);

    expect(screen.getByRole('tab', { name: 'Herkes' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Arkadaşlar' })).not.toBeSelected();
  });

  it('asks for the other side when it is tapped', async () => {
    const onChange = jest.fn();
    await render(<ScopeSwitch value="everyone" onChange={onChange} />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Arkadaşlar' }));

    expect(onChange).toHaveBeenCalledWith('friends');
  });

  it('asks for nothing when the chosen side is tapped again', async () => {
    const onChange = jest.fn();
    await render(<ScopeSwitch value="friends" onChange={onChange} />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Arkadaşlar' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('moves the selection when the value changes', async () => {
    await render(<ScopeSwitch value="everyone" onChange={jest.fn()} />);

    await screen.rerender(<ScopeSwitch value="friends" onChange={jest.fn()} />);

    expect(screen.getByRole('tab', { name: 'Arkadaşlar' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Herkes' })).not.toBeSelected();
  });
});

describe('ScopeSwitch — in English', () => {
  it('offers everyone and friends in English', async () => {
    useLanguage.setState({ locale: 'en' });
    await render(<ScopeSwitch value="friends" onChange={jest.fn()} />);

    expect(screen.getByRole('tab', { name: 'Friends' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Everyone' })).not.toBeSelected();
  });
});
