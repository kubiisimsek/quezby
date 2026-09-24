import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ActivityIndicator, Linking, StatusBar, StyleSheet } from 'react-native';

import { useSession } from '@/auth/session';
import { useAppStatus } from '@/hooks/useAppStatus';
import { useMe } from '@/hooks/useMe';
import { usePendingRunSender } from '@/hooks/usePendingRunSender';
import { messageFor } from '@/lib/errors';
import { tab, useNavTheme, useStackOptions } from '@/navigation/options';
import { TabBar } from '@/navigation/TabBar';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { DailyScreen } from '@/screens/daily/DailyScreen';
import { GameScreen } from '@/screens/game/GameScreen';
import { HelpScreen } from '@/screens/help/HelpScreen';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { LeaderboardScreen } from '@/screens/leaderboard/LeaderboardScreen';
import { LeagueScreen } from '@/screens/league/LeagueScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { SearchScreen } from '@/screens/search/SearchScreen';
import { UsernameScreen } from '@/screens/username/UsernameScreen';
import { WelcomeScreen } from '@/screens/welcome/WelcomeScreen';
import { useSettings } from '@/stores/settings';
import { BrandMark } from '@/ui/brand-mark';
import { Button, Screen, Stamp, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

function TabsShell() {
  return (
    <Tabs.Navigator
      initialRouteName="Home"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="Leaderboard" component={LeaderboardScreen} options={tab('Zirve', 'mountain')} />
      <Tabs.Screen name="League" component={LeagueScreen} options={tab('Lig', 'shield')} />
      <Tabs.Screen name="Home" component={HomeScreen} options={tab('Oyna', 'play')} />
      <Tabs.Screen name="Search" component={SearchScreen} options={tab('Arkadaşlar', 'users')} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={tab('Profil', 'account')} />
    </Tabs.Navigator>
  );
}

/**
 * What mounts, in order: a build the API no longer accepts → the update
 * screen; storage not read yet → the splash; no account → the welcome;
 * an account with no username → the one question; otherwise the game.
 */
export function RootNavigator() {
  const navTheme = useNavTheme();
  const stackOptions = useStackOptions();
  const token = useSession((state) => state.token);
  const user = useSession((state) => state.user);
  const hydrated = useSession((state) => state.hydrated);
  const status = useAppStatus();
  const me = useMe();
  usePendingRunSender();

  useEffect(() => {
    void useSession.getState().hydrate();
    void useSettings.getState().hydrate();
  }, []);

  if (status?.status === 'update_required') {
    return (
      <Splash
        title="Güncelleme gerekli"
        body={`Bu sürüm (${status.minVersion} altı) artık desteklenmiyor. Oynamaya devam etmek için güncelle.`}
        action={
          status.storeUrl ? (
            <Button
              label="Mağazada aç"
              tone="play"
              onPress={() => void Linking.openURL(status.storeUrl ?? '')}
            />
          ) : null
        }
      />
    );
  }

  if (!hydrated || (token && !user && !me.isError)) return <Splash />;

  if (token && !user && me.isError) {
    return (
      <Splash
        title="Bağlanamadık"
        body={messageFor(me.error)}
        action={<Button label="Tekrar dene" tone="play" icon="refresh" onPress={() => void me.refetch()} />}
      />
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={stackOptions}>
        {!token || !user ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : !user.username ? (
          <Stack.Screen name="Username" component={UsernameScreen} options={{ headerShown: false }} />
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
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
