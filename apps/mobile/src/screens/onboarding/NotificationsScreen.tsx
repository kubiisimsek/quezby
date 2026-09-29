import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { allowPush, refreshPushPermission } from '@/hooks/usePush';
import { useT } from '@/i18n';
import { useOnboarding } from '@/stores/onboarding';
import type { IconName } from '@/ui/icons';
import { Button, IconChip, Panel, Screen, Stamp, Txt } from '@/ui/kit';
import { SPACE } from '@/ui/theme';

/** On to the game: this is the last first step. */
function next() {
  useOnboarding.getState().advance();
}

/**
 * A new account's last step, after the usage question: may the game tell them when a friend
 * adds them, sends a VS, plays one or says something? "Bildirimleri aç" brings
 * the system's own question; "Şimdi değil" leaves it for later — the inbox,
 * a conversation and a VS just sent offer it again. A phone that was already
 * asked, a phone whose notifications are on anyway, and a build without push
 * never see this step.
 */
export function NotificationsScreen() {
  const t = useT();
  const words = t.push.onboarding;
  const insets = useSafeAreaInsets();
  const [asking, setAsking] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void refreshPushPermission().then((now) => {
      if (cancelled) return;
      if (now === 'undetermined') setShown(true);
      else next();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const kinds: Array<{ icon: IconName; line: string }> = [
    { icon: 'userPlus', line: words.kinds.friends },
    { icon: 'swords', line: words.kinds.vs },
    { icon: 'message', line: words.kinds.messages },
  ];

  return (
    <Screen>
      <StatusBar barStyle="light-content" />
      {shown ? (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + SPACE.xxl, paddingBottom: insets.bottom + SPACE.xl },
          ]}
        >
          <View style={styles.head}>
            <Stamp from={0.4}>
              <IconChip icon="bell" tone="primary" size="lg" />
            </Stamp>
            <Txt variant="label" tone="muted" align="center">
              {words.eyebrow}
            </Txt>
            <Txt variant="display" align="center">
              {words.title}
            </Txt>
            <Txt variant="body" tone="muted" align="center">
              {words.body}
            </Txt>
          </View>

          <Panel tone="sunken" elevation="flat" style={styles.kinds}>
            {kinds.map((kind) => (
              <View key={kind.icon} style={styles.kind}>
                <IconChip icon={kind.icon} tone="secondary" size="sm" />
                <Txt variant="heading" style={styles.flex}>
                  {kind.line}
                </Txt>
              </View>
            ))}
          </Panel>

          <View style={styles.actions}>
            <Button
              label={words.allow}
              icon="bell"
              tone="primary"
              loading={asking}
              onPress={() => {
                setAsking(true);
                void allowPush().finally(next);
              }}
            />
            <Button label={words.later} tone="ghost" disabled={asking} onPress={next} />
          </View>
        </ScrollView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: SPACE.xxl, justifyContent: 'space-between', paddingHorizontal: SPACE.xl },
  head: { alignItems: 'center', gap: SPACE.md },
  kinds: { gap: SPACE.md, paddingVertical: SPACE.lg },
  kind: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  flex: { flex: 1 },
  actions: { gap: SPACE.md },
});
