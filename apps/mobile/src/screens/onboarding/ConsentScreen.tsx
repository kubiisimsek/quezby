import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnboarding } from '@/stores/onboarding';
import { useSettings } from '@/stores/settings';
import { BrandMark } from '@/ui/brand-mark';
import { ConsentCard, Screen, Stamp } from '@/ui/kit';
import { SPACE } from '@/ui/theme';

/**
 * An account's step once it is in: may the game count how it is used?
 * Nothing is counted before the answer. The answer goes to the account
 * (`useConsentSync`) and the next step comes. A phone that already answered,
 * and an account that said yes on another phone, never see it.
 */
export function ConsentScreen() {
  const insets = useSafeAreaInsets();

  const answer = (yes: boolean) => {
    useSettings.getState().answer(yes);
    useOnboarding.getState().advance();
  };

  return (
    <Screen>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + SPACE.xxl, paddingBottom: insets.bottom + SPACE.xl },
        ]}
      >
        <View style={styles.mark}>
          <Stamp from={0.4}>
            <BrandMark size={64} />
          </Stamp>
        </View>
        <ConsentCard onAnswer={answer} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'stretch',
    flexGrow: 1,
    gap: SPACE.xxl,
    justifyContent: 'center',
    paddingHorizontal: SPACE.xl,
  },
  mark: { alignItems: 'center' },
});
