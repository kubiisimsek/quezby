import type { Me } from '@quezby/types';
import { StyleSheet, View } from 'react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { socialAvailability } from '@/auth/social';
import { PROVIDER_NAMES, signInWays } from '@/components/SignInWaysSheet';
import { APP_ENV, APP_VERSION } from '@/config/env';
import { rememberMe } from '@/hooks/useMe';
import { formatList } from '@/lib/format';
import { useSettings } from '@/stores/settings';
import {
  Divider,
  Eyebrow,
  IconChip,
  Panel,
  Row,
  SwitchRow,
  Txt,
} from '@/ui/kit';
import { Sheet } from '@/ui/sheet';
import { SPACE } from '@/ui/theme';

/** What Ayarlar opens: Yardım, or one of the account's doors. */
export type SettingsDoor = 'help' | 'username' | 'ways' | 'signOut' | 'delete';

const ENV_LABEL = {
  local: 'Local',
  staging: 'Staging',
  production: 'Production',
} as const;

/**
 * What a guest is offered to keep the account with, in this build's words:
 * "Apple ya da e-posta bağla; …".
 */
export function keepHint(): string {
  const available = socialAvailability();
  const offered = [
    ...(['apple', 'google'] as const)
      .filter((provider) => available[provider])
      .map((provider) => PROVIDER_NAMES[provider]),
    'e-posta',
  ];
  return `${formatList(offered, 'ya da')} bağla; telefon değişse de skorların kaybolmaz.`;
}

/** Titreşim on or off: on the phone at once, then on the account. */
function setHaptics(user: Me, value: boolean) {
  useSettings.getState().apply({ haptics: value });
  rememberMe({ ...user, settings: { ...user.settings, haptics: value } });
  void api.me.updateSettings({ haptics: value }).catch(() => undefined);
}

/**
 * Ayarlar — what a player opens now and then, kept off the profile's face:
 * the one setting the game has, Yardım, and the account's doors. A door
 * never opens over this sheet: `onPick` names it, and the profile opens it
 * once this sheet has left the screen.
 */
export function SettingsSheet({
  open,
  onClose,
  onClosed,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onClosed?: () => void;
  onPick: (door: SettingsDoor) => void;
}) {
  const user = useSession((state) => state.user);
  const haptics = useSettings((state) => state.haptics);

  if (!user) return null;

  const ways = signInWays(user);

  return (
    <Sheet open={open} onClose={onClose} onClosed={onClosed} title="Ayarlar">
      <View style={styles.body}>
        <Eyebrow icon="play">Oyun</Eyebrow>
        <Panel tone="sunken" elevation="flat" style={styles.group}>
          <SwitchRow
            leading={<IconChip icon="vibrate" tone="secondary" size="sm" />}
            title="Titreşim"
            subtitle={
              haptics
                ? 'Her kaydırmada ve hatada titrer.'
                : 'Oyun sessizce oynanır.'
            }
            value={haptics}
            onChange={(value) => setHaptics(user, value)}
          />
          <Divider />
          <Row
            leading={<IconChip icon="help" tone="neutral" size="sm" />}
            title="Yardım"
            subtitle="Postlar, puanlar, ligler ve hesabın."
            onPress={() => onPick('help')}
          />
        </Panel>

        <Eyebrow icon="account">Hesap</Eyebrow>
        <Panel tone="sunken" elevation="flat" style={styles.group}>
          <Row
            leading={<IconChip icon="edit" tone="primary" size="sm" />}
            title="Kullanıcı adını değiştir"
            subtitle={`Şu an @${user.username}`}
            onPress={() => onPick('username')}
          />
          <Divider />
          {user.isGuest ? (
            <Row
              leading={<IconChip icon="shield" tone="warn" size="sm" />}
              title="Hesabını koru"
              subtitle={keepHint()}
              onPress={() => onPick('ways')}
            />
          ) : (
            <>
              <Row
                leading={<IconChip icon="shield" tone="ok" size="sm" />}
                title="Giriş yolları"
                subtitle={`${formatList(ways, 've')} bağlı`}
                onPress={() => onPick('ways')}
              />
              <Divider />
              <Row
                leading={<IconChip icon="logout" tone="neutral" size="sm" />}
                title="Çıkış yap"
                subtitle={`Tekrar ${formatList(ways, 'ya da')} ile girebilirsin.`}
                onPress={() => onPick('signOut')}
              />
            </>
          )}
          <Divider />
          <Row
            leading={<IconChip icon="trash" tone="bad" size="sm" />}
            title="Hesabı sil"
            subtitle="Skorların ve adın kalıcı olarak silinir."
            onPress={() => onPick('delete')}
          />
        </Panel>

        <Txt variant="micro" tone="faint" align="center" style={styles.version}>
          Quezby {APP_VERSION} · {ENV_LABEL[APP_ENV]}
        </Txt>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACE.md },
  group: { gap: 0, paddingVertical: SPACE.xs },
  version: { marginTop: SPACE.xs },
});
