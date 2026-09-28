import { create } from 'zustand';

/**
 * The screen on show, as the navigator last reported it (`RootNavigator`'s
 * `onStateChange`): the pulse asks faster on the friends' screens and rests
 * during a run, and a conversation names its friend. Not kept on the phone.
 */
type RouteState = {
  /** The route's name — `RootStackParamList` or `TabParamList`; null before the navigator is up. */
  name: string | null;
  /** The friend whose conversation is open; null anywhere else. */
  username: string | null;
};

export const useCurrentRoute = create<RouteState>(() => ({ name: null, username: null }));

/** The friend a `Thread` route is about, from its params; null for any other route. */
export function threadFriend(route: { name: string; params?: object } | undefined): string | null {
  const params = route?.name === 'Thread' ? route.params : undefined;
  return params && 'username' in params && typeof params.username === 'string' ? params.username : null;
}
