import { useSession } from '@/auth/session';
import { SignInWays } from '@/components/SignInWays';
import { useT } from '@/i18n';
import { Sheet } from '@/ui/sheet';

export { PROVIDER_NAMES, signInWays } from '@/components/SignInWays';

/**
 * "Hesabını koru" for a guest, "Giriş yolları" once the account is kept: the
 * ways in (`SignInWays`) in a sheet. Apple and Google present their own
 * sheets over this one; the email form is a sheet of its own, so `onEmail`
 * asks the screen to open it once this one has left the screen.
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
  if (!user) return null;
  const words = t.auth.ways;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onClosed={onClosed}
      title={user.isGuest ? t.auth.keepAccount : words.title}
      description={description ?? (user.isGuest ? words.guestBody : words.body)}
    >
      {/* A new opening starts clean: no "linked" callout left from the last one. */}
      <SignInWays key={open ? 'open' : 'closed'} onEmail={onEmail} />
    </Sheet>
  );
}
