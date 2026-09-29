import { useState } from 'react';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { handle, useT } from '@/i18n';
import { messageFor } from '@/lib/errors';
import { dropPushToken } from '@/lib/push';
import { Field } from '@/ui/kit';
import { FormSheet } from '@/ui/sheet';

/**
 * Deleting the account for good: the player types their name to confirm —
 * with or without its `@` — and the account, its runs and places go.
 */
export function DeleteSheet({
  open,
  username,
  onClose,
}: {
  open: boolean;
  username: string;
  onClose: () => void;
}) {
  const t = useT();
  const words = t.profile.deleteAccount;
  const [typed, setTyped] = useState('');
  const [pending, setPending] = useState(false);
  /**
   * What went wrong, kept as it came — the name typed wrong, or the API's
   * answer — and put in words in the language of the moment.
   */
  const [failure, setFailure] = useState<'mismatch' | { error: unknown } | null>(null);
  // The label shows the name as `@ekin`: typed with or without its `@`, it confirms.
  const confirmed = typed.trim().toLowerCase().replace(/^@/, '') === username;

  const remove = async () => {
    if (!confirmed) {
      setFailure('mismatch');
      return;
    }
    setPending(true);
    setFailure(null);
    try {
      await api.me.delete();
      // The account's tokens went with it; the phone's own is thrown away too.
      void dropPushToken();
      onClose();
      await useSession.getState().signOut();
    } catch (caught) {
      setFailure({ error: caught });
      setPending(false);
    }
  };

  const error =
    failure === 'mismatch' ? words.mismatch : failure ? messageFor(failure.error, t) : null;

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      title={words.title}
      description={words.description}
      submitLabel={words.submit}
      submitIcon="trash"
      submitTone="danger"
      onSubmit={() => void remove()}
      pending={pending}
      disabled={!confirmed}
      error={error}
    >
      <Field
        label={words.confirm(handle(username))}
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={username}
      />
    </FormSheet>
  );
}
