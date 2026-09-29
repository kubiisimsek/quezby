import { canPickUsername } from '@quezby/config';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session';
import { CredentialsSheet } from '@/components/CredentialsSheet';
import { SignInWays } from '@/components/SignInWays';
import { handle, useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { DeleteSheet } from '@/screens/profile/DeleteSheet';
import { keepHint } from '@/screens/profile/SettingsSheet';
import { UsernameSheet } from '@/screens/profile/UsernameSheet';
import {
  Button,
  Callout,
  Eyebrow,
  IconChip,
  Panel,
  Row,
  Screen,
  TopBar,
} from '@/ui/kit';
import { SPACE } from '@/ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Account'>;

type SheetName = 'username' | 'credentials' | 'delete' | null;

/**
 * Hesap bilgileri, from Ayarlar: the name — a door to pick one while it is
 * still the automatic one, then only the name, locked — the ways in that are
 * attached and the ones that can be added, and at the end, in red, deleting
 * the account for good. Each sheet opens straight over the page: nothing is
 * leaving when it does.
 */
export function AccountScreen({ navigation }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const user = useSession((state) => state.user);
  const [sheet, setSheet] = useState<SheetName>(null);

  if (!user) return null;

  const words = t.profile.account;
  const settings = t.profile.settings;
  const close = () => setSheet(null);

  return (
    <Screen>
      <TopBar title={words.title} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <Eyebrow icon="account">{words.name}</Eyebrow>
        <Panel tone="sunken" elevation="flat" style={styles.group}>
          {canPickUsername(user.username) ? (
            <Row
              leading={<IconChip icon="edit" tone="primary" size="sm" />}
              title={t.profile.pickName.title}
              subtitle={user.username ? settings.pickNameHint(handle(user.username)) : settings.noName}
              onPress={() => setSheet('username')}
            />
          ) : (
            // A picked name never changes: shown, locked, with nothing to press.
            <Row
              leading={<IconChip icon="lock" tone="neutral" size="sm" />}
              title={settings.name}
              subtitle={settings.nameLocked(handle(user.username ?? ''))}
            />
          )}
        </Panel>

        <Eyebrow icon="shield">{words.linked}</Eyebrow>
        {user.isGuest ? (
          <Callout tone="warn" title={t.auth.keepAccount}>
            {keepHint(t)}
          </Callout>
        ) : null}
        <SignInWays attachedHeading={false} onEmail={() => setSheet('credentials')} />

        <View style={styles.danger}>
          <Button
            label={t.profile.deleteAccount.title}
            icon="trash"
            tone="danger"
            size="md"
            onPress={() => setSheet('delete')}
          />
        </View>
      </ScrollView>

      <UsernameSheet open={sheet === 'username'} current={user.username} onClose={close} />
      <CredentialsSheet open={sheet === 'credentials'} guest={user.isGuest} onClose={close} />
      <DeleteSheet open={sheet === 'delete'} username={user.username ?? ''} onClose={close} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: SPACE.md, paddingHorizontal: SPACE.xl },
  group: { gap: 0, paddingVertical: SPACE.xs },
  danger: { marginTop: SPACE.xl },
});
