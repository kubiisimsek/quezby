import { LOCALE_NAMES, canPickUsername } from '@quezby/config';
import type { Me } from '@quezby/types';
import { StyleSheet, View } from 'react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { socialAvailability } from '@/auth/social';
import { PROVIDER_NAMES, signInWays } from '@/components/SignInWaysSheet';
import { APP_ENV, APP_VERSION } from '@/config/env';
import { rememberMe } from '@/hooks/useMe';
import { getT, handle, useLocale, useT, type Messages } from '@/i18n';
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

/** What Ayarlar opens: the language, Yardım, or one of the account's doors. */
export type SettingsDoor = 'language' | 'help' | 'username' | 'ways' | 'signOut' | 'delete';

const ENV_LABEL = {
  local: 'Local',
  staging: 'Staging',
  production: 'Production',
} as const;

/**
 * What a guest is offered to keep the account with, in this build's words
 * and the player's language: "Apple ya da e-posta bağla; …".
 */
export function keepHint(t: Messages = getT()): string {
  const available = socialAvailability();
  const offered = [
    ...(['apple', 'google'] as const)
      .filter((provider) => available[provider])
      .map((provider) => PROVIDER_NAMES[provider]),
    t.auth.ways.email,
  ];
  return t.profile.keepHint(t.fmt.list(offered, 'or'));
}

/**
 * Kullanım verisi on or off: on the phone at once — off, nothing more is
 * recorded and nothing waiting is sent — then on the account
 * (`useConsentSync`), which forgets what it kept about the player on a no.
 */
function setAnalytics(value: boolean) {
  useSettings.getState().answer(value);
}

/** Titreşim on or off: on the phone at once, then on the account. */
function setHaptics(user: Me, value: boolean) {
  useSettings.getState().apply({ haptics: value });
  rememberMe({ ...user, settings: { ...user.settings, haptics: value } });
  void api.me.updateSettings({ haptics: value }).catch(() => undefined);
}

/**
 * The name, as Ayarlar shows it: a door to pick one while the account still
 * plays under the automatic name (or none), and after that only the name
 * itself, locked — a picked name never changes.
 */
function NameRow({ username, onPick }: { username: string | null; onPick: () => void }) {
  const t = useT();
  const words = t.profile.settings;
  if (canPickUsername(username)) {
    return (
      <Row
        leading={<IconChip icon="edit" tone="primary" size="sm" />}
        title={t.profile.pickName.title}
        subtitle={username ? words.pickNameHint(handle(username)) : words.noName}
        onPress={onPick}
      />
    );
  }
  return (
    <Row
      leading={<IconChip icon="lock" tone="neutral" size="sm" />}
      title={words.name}
      subtitle={words.nameLocked(handle(username ?? ''))}
    />
  );
}

/**
 * Ayarlar — what a player opens now and then, kept off the profile's face:
 * the game's two settings, Yardım, and the account's doors. A door
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
  const t = useT();
  const locale = useLocale();
  const user = useSession((state) => state.user);
  const haptics = useSettings((state) => state.haptics);
  const analytics = useSettings((state) => state.analytics);

  if (!user) return null;

  const words = t.profile.settings;
  const ways = signInWays(user, t);

  return (
    <Sheet open={open} onClose={onClose} onClosed={onClosed} title={words.title}>
      <View style={styles.body}>
        <Eyebrow icon="play">{words.game}</Eyebrow>
        <Panel tone="sunken" elevation="flat" style={styles.group}>
          <Row
            leading={<IconChip icon="globe" tone="primary" size="sm" />}
            title={t.language.title}
            subtitle={LOCALE_NAMES[locale]}
            onPress={() => onPick('language')}
          />
          <Divider />
          <SwitchRow
            leading={<IconChip icon="vibrate" tone="secondary" size="sm" />}
            title={words.haptics}
            subtitle={haptics ? words.hapticsOn : words.hapticsOff}
            value={haptics}
            onChange={(value) => setHaptics(user, value)}
          />
          <Divider />
          <SwitchRow
            leading={<IconChip icon="trendUp" tone="secondary" size="sm" />}
            title={words.analytics}
            subtitle={analytics ? words.analyticsOn : words.analyticsOff}
            value={analytics}
            onChange={setAnalytics}
          />
          <Divider />
          <Row
            leading={<IconChip icon="help" tone="neutral" size="sm" />}
            title={t.help.title}
            subtitle={words.helpHint}
            onPress={() => onPick('help')}
          />
        </Panel>

        <Eyebrow icon="account">{words.account}</Eyebrow>
        <Panel tone="sunken" elevation="flat" style={styles.group}>
          <NameRow username={user.username} onPick={() => onPick('username')} />
          <Divider />
          {user.isGuest ? (
            <Row
              leading={<IconChip icon="shield" tone="warn" size="sm" />}
              title={t.auth.keepAccount}
              subtitle={keepHint(t)}
              onPress={() => onPick('ways')}
            />
          ) : (
            <>
              <Row
                leading={<IconChip icon="shield" tone="ok" size="sm" />}
                title={t.auth.ways.title}
                subtitle={words.waysLinked(t.fmt.list(ways, 'and'))}
                onPress={() => onPick('ways')}
              />
              <Divider />
              <Row
                leading={<IconChip icon="logout" tone="neutral" size="sm" />}
                title={words.signOut}
                subtitle={words.signOutHint(t.fmt.list(ways, 'or'))}
                onPress={() => onPick('signOut')}
              />
            </>
          )}
          <Divider />
          <Row
            leading={<IconChip icon="trash" tone="bad" size="sm" />}
            title={t.profile.deleteAccount.title}
            subtitle={words.deleteHint}
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
