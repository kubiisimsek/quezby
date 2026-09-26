import type { Me, SocialProvider } from '@quezby/types';
import { useEffect, useState, type ReactNode } from 'react';
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
  SocialButton,
  Tag,
  Txt,
} from '@/ui/kit';
import { Sheet } from '@/ui/sheet';
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
 * "Hesabını koru" for a guest, "Giriş yolları" once the account is kept: the
 * ways in that are attached, one tile each — Apple and Google can be taken
 * off again, and the API refuses the last one — and the ones that can still
 * be added. Apple and Google present their own sheets over this one; the
 * email form is a sheet of its own, so `onEmail` asks the profile to open it
 * once this one has left the screen.
 */
export function SignInWaysSheet({
  open,
  onClose,
  onClosed,
  onEmail,
  description,
}: {
  open: boolean;
  onClose: () => void;
  onClosed?: () => void;
  onEmail: () => void;
  /** Why now, when the sheet comes up on its own — the lobby's "Ligdesin!". */
  description?: string;
}) {
  const t = useT();
  const user = useSession((state) => state.user);
  const social = useSocialAuth();
  const [added, setAdded] = useState<SocialProvider | null>(null);

  useEffect(() => {
    if (!open) setAdded(null);
  }, [open]);

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
    <Sheet
      open={open}
      onClose={onClose}
      onClosed={onClosed}
      title={user.isGuest ? t.auth.keepAccount : words.title}
      description={description ?? (user.isGuest ? words.guestBody : words.body)}
    >
      <View style={styles.body}>
        {added ? (
          <Callout title={t.auth.linked(PROVIDER_NAMES[added])}>
            {words.linkedBody(PROVIDER_NAMES[added])}
          </Callout>
        ) : null}
        {social.error ? <Callout tone="bad">{social.error}</Callout> : null}

        {hasWays ? (
          <>
            <Eyebrow icon="shield">{words.attached}</Eyebrow>
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
    </Sheet>
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
      <View
        pointerEvents="none"
        style={[styles.tileEdge, { backgroundColor: theme.tileHi }]}
      />
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
  tileEdge: { height: 3, left: 0, position: 'absolute', right: 0, top: 0 },
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
