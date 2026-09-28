import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { tab } from '@/navigation/options';
import { TabBar } from '@/navigation/TabBar';

const ROUTES = [
  { key: 'Leaderboard-1', name: 'Leaderboard', options: tab('Zirve', 'mountain') },
  { key: 'League-1', name: 'League', options: tab('Lig', 'shield') },
  { key: 'Home-1', name: 'Home', options: tab('Oyna', 'play') },
  { key: 'Friends-1', name: 'Friends', options: tab('Arkadaşlar', 'users') },
  { key: 'Profile-1', name: 'Profile', options: tab('Profil', 'account') },
];

function renderDock(index: number, badge?: number) {
  const navigate = jest.fn();
  const emit = jest.fn(() => ({ defaultPrevented: false }));
  const routes = ROUTES.map((route) =>
    route.name === 'Friends' ? { ...route, options: { ...route.options, tabBarBadge: badge } } : route,
  );
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
      'Arkadaşlar',
      'Profil',
    ]);
    expect(screen.getByRole('tab', { name: 'Oyna' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Zirve' })).not.toBeSelected();
  });

  it('goes where a slot points, and stays put on the one you are on', async () => {
    const { rendered, navigate, emit } = renderDock(0);
    await rendered;

    await fireEvent.press(screen.getByRole('tab', { name: 'Arkadaşlar' }));
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'tabPress', target: 'Friends-1' }));
    expect(navigate).toHaveBeenCalledWith('Friends');

    await fireEvent.press(screen.getByRole('tab', { name: 'Oyna' }));
    expect(navigate).toHaveBeenCalledWith('Home');

    navigate.mockClear();
    await fireEvent.press(screen.getByRole('tab', { name: 'Zirve' }));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('counts what waits among friends on their slot, and says so', async () => {
    const { rendered } = renderDock(2, 3);
    await rendered;

    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Arkadaşlar, 3 yeni' })).toBeOnTheScreen();
  });

  it('shows no count when nothing waits', async () => {
    const { rendered } = renderDock(2);
    await rendered;

    expect(screen.getByRole('tab', { name: 'Arkadaşlar' })).toBeOnTheScreen();
  });
});
