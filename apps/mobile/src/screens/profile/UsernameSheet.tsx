import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { api } from '@/api/client';
import { UsernameField } from '@/components/UsernameField';
import { rememberMe } from '@/hooks/useMe';
import { useUsernameCheck } from '@/hooks/useUsernameCheck';
import { handle, useT } from '@/i18n';
import { messageFor } from '@/lib/errors';
import { FormSheet } from '@/ui/sheet';

/**
 * The player's one pick of a name, over the automatic one (`guest48128742`)
 * — Hesap bilgileri only opens it while the name can still be picked. What is saved
 * here never changes, and the sheet says so before it is saved.
 */
export function UsernameSheet({
  open,
  current,
  onClose,
}: {
  open: boolean;
  current: string | null;
  onClose: () => void;
}) {
  const t = useT();
  const words = t.profile.pickName;
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);
  /** What went wrong, kept as it came — its words are read in the language of the moment. */
  const [failure, setFailure] = useState<{ error: unknown } | null>(null);
  const check = useUsernameCheck(value, current);
  const queryClient = useQueryClient();

  const ready = check.state === 'available' || check.state === 'unknown';

  const save = async () => {
    if (check.state !== 'available' && check.state !== 'unknown') return;
    setPending(true);
    setFailure(null);
    try {
      const { user } = await api.me.updateUsername(check.normalized);
      rememberMe(user);
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      onClose();
    } catch (caught) {
      setFailure({ error: caught });
    } finally {
      setPending(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      title={words.title}
      description={
        current ? words.description(handle(current)) : words.descriptionNoName
      }
      onSubmit={() => void save()}
      pending={pending}
      disabled={!ready}
      error={failure ? messageFor(failure.error, t) : null}
    >
      <UsernameField value={value} onChange={setValue} check={check} />
    </FormSheet>
  );
}
