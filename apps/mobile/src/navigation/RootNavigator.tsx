import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StatusBar, StyleSheet } from 'react-native';

import { track, trackScreen } from '@/analytics/track';
import { useSession } from '@/auth/session';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAppStatus } from '@/hooks/useAppStatus';
import { useConsentSync } from '@/hooks/useConsentSync';
import { useDeviceCheck } from '@/hooks/useDeviceCheck';
import { useLanguageSync } from '@/hooks/useLanguageSync';
import { useMe } from '@/hooks/useMe';
import { usePendingRunSender } from '@/hooks/usePendingRunSender';
import { usePulse } from '@/hooks/usePulse';
import { usePushEvents, usePushRegistration } from '@/hooks/usePush';
import { useInboxSummary } from '@/hooks/useSocial';
import { useLanguage, useT } from '@/i18n';
import { messageFor } from '@/lib/errors';
import { gateFor } from '@/navigation/gate';
import { tab, useNavTheme, useStackOptions } from '@/navigation/options';
import { TabBar } from '@/navigation/TabBar';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { DailyScreen } from '@/screens/daily/DailyScreen';
import { FindFriendsScreen } from '@/screens/friends/FindFriendsScreen';
import { FriendsScreen } from '@/screens/friends/FriendsScreen';
import { InboxScreen } from '@/screens/friends/InboxScreen';
import { ThreadScreen } from '@/screens/friends/ThreadScreen';
import { GameScreen } from '@/screens/game/GameScreen';
import { HelpScreen } from '@/screens/help/HelpScreen';
import { HistoryScreen } from '@/screens/history/HistoryScreen';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { LeaderboardScreen } from '@/screens/leaderboard/LeaderboardScreen';
import { LeagueScreen } from '@/screens/league/LeagueScreen';
import { NotificationsScreen } from '@/screens/onboarding/NotificationsScreen';
import { ProtectScreen } from '@/screens/onboarding/ProtectScreen';
import { AlertsScreen } from '@/screens/alerts/AlertsScreen';
import { AccountScreen } from '@/screens/profile/AccountScreen';
import { AvatarEditorScreen } from '@/screens/profile/AvatarEditorScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { UsernameScreen } from '@/screens/username/UsernameScreen';
import { WelcomeScreen } from '@/screens/welcome/WelcomeScreen';
import { useOnboarding } from '@/stores/onboarding';
import { usePush } from '@/stores/push';
import { threadFriend, useCurrentRoute } from '@/stores/route';
import { useSettings } from '@/stores/settings';
import { BrandMark } from '@/ui/brand-mark';
import { Button, Screen, Stamp, Toast, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

/** The screen on show, for the visit's journey and the inbox's pulse. */
const navigationRef = createNavigationContainerRef<RootStackParamList>();

const onScreen = () => {
  const route = navigationRef.getCurrentRoute();
  trackScreen(route?.name);
  useCurrentRoute.setState({ name: route?.name ?? null, username: threadFriend(route) });
};

function TabsShell() {
  const { tabs } = useT().nav;
  const inbox = useInboxSummary();
  // Conversations wanting a look and requests waiting: both live on Mesajlar.
  const waiting = (inbox.data?.threads ?? 0) + (inbox.data?.requests ?? 0);
  return (
    <Tabs.Navigator
      initialRouteName="Home"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="Leaderboard" component={LeaderboardScreen} options={tab(tabs.leaderboard, 'mountain')} />
      <Tabs.Screen name="League" component={LeagueScreen} options={tab(tabs.league, 'shield')} />
      <Tabs.Screen name="Home" component={HomeScreen} options={tab(tabs.play, 'play')} />
      <Tabs.Screen
        name="Inbox"
        component={InboxScreen}
        options={{ ...tab(tabs.inbox, 'message'), tabBarBadge: waiting > 0 ? waiting : undefined }}
      />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={tab(tabs.profile, 'account')} />
    </Tabs.Navigator>
  );
}

/**
 * What mounts is `gateFor`'s answer: a build the API no longer accepts → the
 * update screen; storage not read yet — or the app still turning to read its
 * language the right way — → the splash; no account → the
 * welcome; a new account's first steps — the practice run, the name,
 * notifications, keeping the account — one screen at a time; an account from
 * before automatic names → the name question; otherwise the game.
 */
export function RootNavigator() {
  const navTheme = useNavTheme();
  const stackOptions = useStackOptions();
  const token = useSession((state) => state.token);
  const user = useSession((state) => state.user);
  const hydrated = useSession((state) => state.hydrated);
  const onboardingHydrated = useOnboarding((state) => state.hydrated);
  const onboardingUser = useOnboarding((state) => state.userId);
  const onboardingStep = useOnboarding((state) => state.step);
  const languageReady = useLanguage((state) => state.phase === 'ready');
  const t = useT();
  const status = useAppStatus();
  const me = useMe();
  usePendingRunSender();
  useDeviceCheck();
  useConsentSync();
  useLanguageSync();
  useAnalytics();
  usePushRegistration();
  usePushEvents();
  const notice = usePush((state) => state.notice);
  const opened = usePush((state) => state.opened);
  /** The navigator has mounted: a tapped notification can be opened. */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void useLanguage.getState().hydrate();
    void useSession.getState().hydrate();
    void useOnboarding.getState().hydrate();
    void useSettings.getState().hydrate();
  }, []);

  const gate = gateFor({
    updateRequired: status?.status === 'update_required',
    hydrated: hydrated && onboardingHydrated && languageReady,
    token,
    user,
    meFailed: me.isError,
    onboarding: { userId: onboardingUser, step: onboardingStep },
  });
  usePulse(gate === 'game');

  // The two screens outside the navigator, counted as moments of the visit.
  useEffect(() => {
    if (gate === 'offline') track('offline_gate');
    if (gate === 'update') track('update_gate');
  }, [gate]);

  // A tapped notification opens what it is about once the game is up: a
  // request, the bell's list (it answers there); anything else, that
  // friend's conversation.
  useEffect(() => {
    if (!opened || gate !== 'game' || !navigationRef.isReady()) return;
    usePush.getState().consumed();
    if (opened.kind === 'friend_request') {
      navigationRef.navigate('Alerts');
    } else {
      navigationRef.navigate('Thread', { username: opened.username });
    }
  }, [gate, opened, ready]);

  if (status?.status === 'update_required') {
    return (
      <Splash
        title={t.nav.updateTitle}
        body={t.nav.updateBody(status.minVersion)}
        action={
          status.storeUrl ? (
            <Button
              label={t.nav.openStore}
              tone="play"
              onPress={() => void Linking.openURL(status.storeUrl ?? '')}
            />
          ) : null
        }
      />
    );
  }

  if (gate === 'splash') return <Splash />;

  if (gate === 'offline') {
    return (
      <Splash
        title={t.nav.offlineTitle}
        body={messageFor(me.error, t)}
        action={<Button label={t.nav.retry} tone="play" icon="refresh" onPress={() => void me.refetch()} />}
      />
    );
  }

  return (
    <>
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      onReady={() => {
        setReady(true);
        onScreen();
      }}
      onStateChange={onScreen}
    >
      <Stack.Navigator screenOptions={stackOptions}>
        {gate === 'welcome' ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : gate === 'tutorial' ? (
          <Stack.Screen
            name="Tutorial"
            component={GameScreen}
            options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }}
          />
        ) : gate === 'nickname' || gate === 'username' ? (
          <Stack.Screen name="Username" component={UsernameScreen} options={{ headerShown: false }} />
        ) : gate === 'notifications' ? (
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
        ) : gate === 'protect' ? (
          <Stack.Screen name="Protect" component={ProtectScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={TabsShell} options={{ headerShown: false }} />
            <Stack.Screen
              name="Game"
              component={GameScreen}
              initialParams={{ mode: 'free' }}
              options={{
                headerShown: false,
                gestureEnabled: false,
                fullScreenGestureEnabled: false,
                animation: 'fade',
              }}
            />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="Daily" component={DailyScreen} />
            <Stack.Screen name="FindFriends" component={FindFriendsScreen} />
            <Stack.Screen name="Thread" component={ThreadScreen} />
            <Stack.Screen
              name="Friends"
              component={FriendsScreen}
              // Yours and a friend's are two screens: opening one never replaces the other.
              getId={({ params }) => params?.username ?? 'me'}
            />
            <Stack.Screen name="Account" component={AccountScreen} />
            <Stack.Screen name="Alerts" component={AlertsScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="AvatarEditor" component={AvatarEditorScreen} options={{ gestureEnabled: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    {gate === 'game' ? (
      <Toast
        notice={notice}
        onPress={() => {
          const data = usePush.getState().notice?.data;
          usePush.getState().hide();
          if (data) usePush.getState().open(data);
        }}
      />
    ) : null}
    </>
  );
}

function Splash({
  title,
  body,
  action,
}: {
  title?: string;
  body?: string;
  action?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Screen style={styles.splash}>
      <StatusBar barStyle="light-content" />
      <Stamp from={0.5}>
        <BrandMark size={96} />
      </Stamp>
      {title ? (
        <Txt variant="display" align="center">
          {title}
        </Txt>
      ) : null}
      {body ? (
        <Txt variant="body" tone="muted" align="center">
          {body}
        </Txt>
      ) : null}
      {action ?? (title ? null : <ActivityIndicator color={theme.gold} size="large" />)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  splash: {
    alignItems: 'center',
    flex: 1,
    gap: SPACE.lg,
    justifyContent: 'center',
    padding: SPACE.xxl,
  },
});
