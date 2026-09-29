import type { Me, SocialProvider } from '@quezby/types';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { useSocialAuth } from '@/hooks/useSocialAuth';
import { getT, useT, type Messages } from '@/i18n';
import { GoogleMark } from '@/ui/brand-mark';
import { Icon } from '@/ui/icons';
import {
  Button,
  Callout,
  Eyebrow,
  IconChip,
  LitEdge,
  SocialButton,
  Tag,
  Txt,
} from '@/ui/kit';
import { DEPTH, RADIUS, SPACE, useTheme } from '@/ui/theme';

const PROVIDERS: SocialProvider[] = ['apple', 'google'];

/** The companies' own names — the same in every language. */
export const PROVIDER_NAMES: Record<SocialProvider, string> = {
  apple: 'Apple',
  google: 'Google',
};

/**
 * Every way this player can sign in, in a fixed order and in `t`'s language:
 * `['Apple', 'e-posta']`, `['Apple', 'email']`.
 */
export function signInWays(
  user: Pick<Me, 'identities' | 'email'>,
  t: Messages = getT(),
): string[] {
  return [
    ...PROVIDERS.filter((provider) => user.identities.includes(provider)).map(
      (provider) => PROVIDER_NAMES[provider],
    ),
    ...(user.email ? [t.auth.ways.email] : []),
  ];
}

/**
 * The ways in, as tiles and slabs: the ones attached — Apple and Google can
 * be taken off again, and the API refuses the last one — then the ones that
 * can still be added. Apple and Google present their own sheets; the email
 * form is the caller's to open (`onEmail`). Drawn in the "Hesabını koru" /
 * "Giriş yolları" sheet and on Hesap bilgileri.
 */
export function SignInWays({
  onEmail,
  attachedHeading = true,
}: {
  onEmail: () => void;
  /** "Bağlı yollar" over the attached tiles; off where the page names the section itself. */
  attachedHeading?: boolean;
}) {
  const t = useT();
  const user = useSession((state) => state.user);
  const social = useSocialAuth();
  const [added, setAdded] = useState<SocialProvider | null>(null);

  if (!user) return null;

  const linked = PROVIDERS.filter((provider) =>
    user.identities.includes(provider),
  );
  const addable = PROVIDERS.filter(
    (provider) =>
      social.available[provider] && !user.identities.includes(provider),
  );
  const busy = social.busy !== null;
  const hasWays = linked.length > 0 || Boolean(user.email);
  const words = t.auth.ways;

  const link = async (provider: SocialProvider) => {
    setAdded(null);
    await social.link(provider);
    if (useSession.getState().user?.identities.includes(provider)) {
      setAdded(provider);
    }
  };

  return (
    <View style={styles.body}>
      {added ? (
        <Callout title={t.auth.linked(PROVIDER_NAMES[added])}>
          {words.linkedBody(PROVIDER_NAMES[added])}
        </Callout>
      ) : null}
      {social.error ? <Callout tone="bad">{social.error}</Callout> : null}

      {hasWays ? (
        <>
          {attachedHeading ? <Eyebrow icon="shield">{words.attached}</Eyebrow> : null}
          {linked.map((provider) => (
            <WayTile
              key={provider}
              gem={<ProviderGem provider={provider} />}
              title={PROVIDER_NAMES[provider]}
              detail={<Tag label={words.attachedTag} tone="ok" icon="check" />}
              action={
                <Button
                  label={words.unlink}
                  tone="neutral"
                  size="sm"
                  loading={social.busy === provider}
                  disabled={busy}
                  onPress={() => void social.unlink(provider)}
                />
              }
            />
          ))}
          {user.email ? (
            <WayTile
              gem={<IconChip icon="mail" tone="ok" size="md" />}
              title={t.auth.email}
              detail={
                <Txt variant="meta" tone="muted" numberOfLines={1}>
                  {user.email}
                </Txt>
              }
            />
          ) : null}
        </>
      ) : null}

      {addable.length > 0 || !user.email ? (
        <>
          {hasWays ? (
            <Eyebrow icon="plus">{words.addAnother}</Eyebrow>
          ) : null}
          {addable.map((provider) => (
            <SocialButton
              key={provider}
              provider={provider}
              loading={social.busy === provider}
              disabled={busy}
              onPress={() => void link(provider)}
            />
          ))}
          {!user.email ? (
            <Button
              label={user.isGuest ? t.auth.keepWithEmail : words.addEmail}
              icon="mail"
              tone="neutral"
              disabled={busy}
              onPress={onEmail}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

/**
 * One way in, as a tile: whose it is, that it is attached, and — for Apple
 * and Google — the slab that takes it off.
 */
function WayTile({
  gem,
  title,
  detail,
  action,
}: {
  gem: ReactNode;
  title: string;
  detail: ReactNode;
  action?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: theme.raised, borderColor: theme.outline },
      ]}
    >
      <LitEdge color={theme.tileHi} />
      {gem}
      <View style={styles.tileText}>
        <Txt variant="heading">{title}</Txt>
        {detail}
      </View>
      {action}
    </View>
  );
}

/**
 * Apple's and Google's marks on a gem of their own surface, the way each
 * draws its sign-in button — no gloss, which neither company allows.
 */
function ProviderGem({ provider }: { provider: SocialProvider }) {
  const theme = useTheme();
  const apple = provider === 'apple';
  return (
    <View
      style={[
        styles.gem,
        {
          backgroundColor: apple ? theme.appleBg : theme.googleBg,
          borderColor: theme.outline,
        },
      ]}
    >
      {apple ? (
        <Icon name="apple" size={20} color={theme.appleInk} />
      ) : (
        <GoogleMark size={19} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACE.md },
  tile: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + DEPTH.lipSm,
    borderRadius: RADIUS.panel,
    borderWidth: DEPTH.outline,
    flexDirection: 'row',
    gap: SPACE.md,
    overflow: 'hidden',
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
  },
  tileText: { alignItems: 'flex-start', flex: 1, gap: SPACE.xs },
  gem: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + 2,
    borderRadius: 12,
    borderWidth: DEPTH.outline,
    height: 40,
    justifyContent: 'center',
    width: 38,
  },
});
