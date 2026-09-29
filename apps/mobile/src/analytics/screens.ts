import type { AnalyticsScreen } from '@quezby/types';

import type { RootStackParamList, TabParamList } from '@/navigation/types';

type Route = Exclude<keyof RootStackParamList, 'Tabs'> | keyof TabParamList;

/** Every route the navigator can show, as a visit's journey names it — a new route must be named here. */
const SCREENS: Record<Route, AnalyticsScreen> = {
  Welcome: 'welcome',
  Login: 'login',
  Tutorial: 'tutorial',
  Username: 'username',
  Protect: 'protect',
  Game: 'game',
  Help: 'help',
  Daily: 'daily',
  FindFriends: 'search',
  Thread: 'thread',
  History: 'history',
  AvatarEditor: 'avatar',
  Notifications: 'notifications',
  Leaderboard: 'leaderboard',
  League: 'league',
  Home: 'home',
  // The same dock slot as before 2026-09-29, when it was Arkadaşlar: its code stays.
  Inbox: 'friends',
  Profile: 'profile',
  Friends: 'friend_list',
  Account: 'account',
  Alerts: 'alerts',
};

export function screenOf(route: string | undefined): AnalyticsScreen | null {
  return route !== undefined && Object.prototype.hasOwnProperty.call(SCREENS, route)
    ? SCREENS[route as Route]
    : null;
}
