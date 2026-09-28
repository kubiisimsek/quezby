import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { AppState, StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queryClient';
import { RootNavigator } from '@/navigation/RootNavigator';
import { THEME } from '@/ui/theme';

/**
 * The phone's foreground is the query cache's focus: coming back to the game
 * asks again for what went stale — the inbox's badges above all — and while
 * it sits in the background nothing polls.
 */
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) => handleFocus(state === 'active'));
  return () => subscription.remove();
});

export default function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={THEME.nightDeep} />
        <QueryClientProvider client={queryClient}>
          <RootNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
