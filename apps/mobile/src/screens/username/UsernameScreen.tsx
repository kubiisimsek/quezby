import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import { UsernameField } from '@/components/UsernameField';
import { rememberMe } from '@/hooks/useMe';
import { useUsernameCheck } from '@/hooks/useUsernameCheck';
import { messageFor } from '@/lib/errors';
import { BrandMark } from '@/ui/brand-mark';
import { Button, Callout, Panel, Screen, Stamp, Txt } from '@/ui/kit';
import { SPACE } from '@/ui/theme';

/**
 * The one question before the first ranked run: what the leaderboard should
 * call you. The rules tick off as you type and the API is asked whether the
 * name is free before the button is worth pressing.
 */
export function UsernameScreen() {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const check = useUsernameCheck(value);

  const ready = check.state === 'available' || check.state === 'unknown';

  const save = async () => {
    if (!ready) {
      setError(check.state === 'invalid' || check.state === 'taken'
        ? check.message
        : 'Önce bir kullanıcı adı seç.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { user } = await api.me.updateUsername(check.normalized);
      rememberMe(user);
    } catch (caught) {
      setError(messageFor(caught));
      setPending(false);
    }
  };

  return (
    <Screen>
      <StatusBar barStyle="light-content" />
      <View style={[styles.head, { paddingTop: insets.top + SPACE.xl }]}>
        <Stamp from={0.4}>
          <BrandMark size={64} />
        </Stamp>
        <Txt variant="display" align="center">
          Sıralamada adın ne olsun?
        </Txt>
        <Txt variant="meta" tone="muted" align="center">
          Benzersiz olmalı. Harf, rakam, nokta ve yıldız kullanabilirsin.
        </Txt>
      </View>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          <Panel style={styles.panel}>
            <UsernameField value={value} onChange={setValue} check={check} autoFocus />
          </Panel>
          {error ? <Callout tone="bad">{error}</Callout> : null}
          <Button
            label="Devam"
            tone="play"
            icon="play"
            onPress={() => void save()}
            loading={pending}
            disabled={!ready}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  head: { alignItems: 'center', gap: SPACE.sm, paddingBottom: SPACE.lg, paddingHorizontal: SPACE.xl },
  panel: { gap: SPACE.md, padding: SPACE.lg },
  content: { gap: SPACE.lg, padding: SPACE.xl },
});
