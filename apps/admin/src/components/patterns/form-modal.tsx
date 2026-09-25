import { useId, type FormEvent, type ReactNode } from 'react';

import { Button } from '@/components/base/button';
import { Modal } from '@/components/base/modal';
import type { TagTone } from '@/components/base/tag';
import { Callout } from '@/components/patterns/callout';

/**
 * A small form in a dialog — a reason, a new admin. The fields are read with
 * `FormData` on submit; an error from the API shows above the fields and
 * each field can show its own.
 */
export function FormModal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  tone = 'primary',
  submitLabel,
  submitTone = 'primary',
  onSubmit,
  loading = false,
  error,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: TagTone;
  submitLabel: string;
  submitTone?: 'primary' | 'danger';
  onSubmit: (data: FormData) => void;
  loading?: boolean;
  /** A message for the whole form — field errors belong to the fields. */
  error?: string | null;
  children: ReactNode;
}) {
  const formId = useId();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !loading && onOpenChange(next)}
      title={title}
      description={description}
      icon={icon}
      tone={tone}
      footer={
        <>
          <Button tone="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Vazgeç
          </Button>
          <Button type="submit" form={formId} tone={submitTone} loading={loading}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-4" noValidate>
        {error ? <Callout tone="bad">{error}</Callout> : null}
        {children}
      </form>
    </Modal>
  );
}
