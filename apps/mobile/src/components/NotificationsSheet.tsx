import type { UserSettings } from '@quezby/types';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { refreshPushPermission, turnOnPush } from '@/hooks/usePush';
import { rememberMe } from '@/hooks/useMe';
import { useT } from '@/i18n';
import { usePush } from '@/stores/push';
import { Button, Callout, Divider, IconChip, Panel, SwitchRow } from '@/ui/kit';
import { Sheet } from '@/ui/sheet';
import { SPACE } from '@/ui/theme';

type PushSetting = 'pushFriends' | 'pushVs' | 'pushMessages';

/**
 * Ayarlar → Bildirimler: which news reaches the phone — requests, VS,
 * phrases — kept on the account, so the API sends only those. Over them,
 * where the phone itself stands: never asked (a slab to allow them), turned
 * off in the phone's settings (the way there), or a build without push.
 */
export function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const words = t.push.settings;
  const user = useSession((state) => state.user);
  const permission = usePush((state) => state.permission);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFailed(false);
    void refreshPushPermission();
  }, [open]);

  if (!user) return null;

  const set = (key: PushSetting, value: boolean) => {
    const before = user.settings;
    const next: UserSettings = { ...before, [key]: value };
    setFailed(false);
    rememberMe({ ...user, settings: next });
    api.me
      .updateSettings({ [key]: value })
      .then(({ settings }) => {
        const now = useSession.getState().user;
        if (now) rememberMe({ ...now, settings });
      })
      .catch(() => {
        const now = useSession.getState().user;
        if (now) rememberMe({ ...now, settings: { ...now.settings, [key]: before[key] } });
        setFailed(true);
      });
  };

  const rows: Array<{ key: PushSetting; title: string; hint: string; icon: 'userPlus' | 'swords' | 'message' }> = [
    { key: 'pushFriends', title: words.friends, hint: words.friendsHint, icon: 'userPlus' },
    { key: 'pushVs', title: words.vs, hint: words.vsHint, icon: 'swords' },
    { key: 'pushMessages', title: words.messages, hint: words.messagesHint, icon: 'message' },
  ];

  return (
    <Sheet open={open} onClose={onClose} title={words.title} description={words.description}>
      <View style={styles.body}>
        {permission === 'unavailable' ? (
          <Callout tone="info">{words.unavailable}</Callout>
        ) : permission === 'denied' ? (
          <>
            <Callout tone="warn">{words.off}</Callout>
            <Button
              label={words.openSettings}
              icon="sliders"
              tone="primary"
              size="md"
              onPress={() => turnOnPush(permission)}
            />
          </>
        ) : permission === 'undetermined' ? (
          <Button label={words.allow} icon="bell" tone="primary" size="md" onPress={() => turnOnPush(permission)} />
        ) : null}
        <Panel tone="sunken" elevation="flat" style={styles.group}>
          {rows.map((row, index) => (
            <View key={row.key}>
              {index > 0 ? <Divider /> : null}
              <SwitchRow
                leading={<IconChip icon={row.icon} tone="secondary" size="sm" />}
                title={row.title}
                subtitle={row.hint}
                value={user.settings[row.key]}
                onChange={(value) => set(row.key, value)}
              />
            </View>
          ))}
        </Panel>
        {failed ? <Callout tone="bad">{words.failed}</Callout> : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACE.md },
  group: { gap: 0, paddingVertical: SPACE.xs },
});
