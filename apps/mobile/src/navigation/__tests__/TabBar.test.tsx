import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { tab } from '@/navigation/options';
import { TabBar } from '@/navigation/TabBar';

const ROUTES = [
  { key: 'Leaderboard-1', name: 'Leaderboard', options: tab('Zirve', 'mountain') },
  { key: 'League-1', name: 'League', options: tab('Lig', 'shield') },
  { key: 'Home-1', name: 'Home', options: tab('Oyna', 'play') },
  { key: 'Inbox-1', name: 'Inbox', options: tab('Mesajlar', 'message') },
  { key: 'Profile-1', name: 'Profile', options: tab('Profil', 'account') },
];

/** The dock on slot `index`, with conversations waiting on Mesajlar and requests on Profil. */
function renderDock(index: number, badges: { Inbox?: number; Profile?: number } = {}) {
  const navigate = jest.fn();
  const emit = jest.fn(() => ({ defaultPrevented: false }));
  const routes = ROUTES.map((route) => {
    const badge = badges[route.name as keyof typeof badges];
    return badge === undefined ? route : { ...route, options: { ...route.options, tabBarBadge: badge } };
  });
  const props = {
    state: { index, routes: routes.map(({ key, name }) => ({ key, name })) },
    descriptors: Object.fromEntries(routes.map((route) => [route.key, { options: route.options }])),
    navigation: { navigate, emit },
  } as unknown as BottomTabBarProps;
  return {
    navigate,
    emit,
    rendered: render(
      <SafeAreaProvider>
        <TabBar {...props} />
      </SafeAreaProvider>,
    ),
  };
}

describe('TabBar — the dock', () => {
  it('has five slots, the lobby in the middle', async () => {
    const { rendered } = renderDock(2);
    await rendered;

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((node) => node.props.accessibilityLabel)).toEqual([
      'Zirve',
      'Lig',
      'Oyna',
      'Mesajlar',
      'Profil',
    ]);
    expect(screen.getByRole('tab', { name: 'Oyna' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Zirve' })).not.toBeSelected();
  });

  it('goes where a slot points, and stays put on the one you are on', async () => {
    const { rendered, navigate, emit } = renderDock(0);
    await rendered;

    await fireEvent.press(screen.getByRole('tab', { name: 'Mesajlar' }));
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'tabPress', target: 'Inbox-1' }));
    expect(navigate).toHaveBeenCalledWith('Inbox');

    await fireEvent.press(screen.getByRole('tab', { name: 'Oyna' }));
    expect(navigate).toHaveBeenCalledWith('Home');

    navigate.mockClear();
    await fireEvent.press(screen.getByRole('tab', { name: 'Zirve' }));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('counts the conversations waiting on Mesajlar and the requests on Profil, and says so', async () => {
    const { rendered } = renderDock(2, { Inbox: 3, Profile: 1 });
    await rendered;

    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Mesajlar, 3 yeni' })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Profil, 1 yeni' })).toBeOnTheScreen();
  });

  it('shows no count when nothing waits', async () => {
    const { rendered } = renderDock(2);
    await rendered;

    expect(screen.getByRole('tab', { name: 'Mesajlar' })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Profil' })).toBeOnTheScreen();
  });
});
