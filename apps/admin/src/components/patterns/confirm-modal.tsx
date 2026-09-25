import { TriangleAlert } from 'lucide-react';
import { useRef, type ReactNode } from 'react';

import { Button } from '@/components/base/button';
import { Modal } from '@/components/base/modal';

/**
 * Every act that cannot be taken back asks first. The title names the thing,
 * the description says what happens, the button says the act — and focus
 * lands on "Vazgeç", so a stray Enter changes nothing.
 */
export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  loading = false,
  tone = 'danger',
  icon,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  tone?: 'danger' | 'primary';
  icon?: ReactNode;
  children?: ReactNode;
}) {
  const cancel = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !loading && onOpenChange(next)}
      title={title}
      description={description}
      icon={icon ?? <TriangleAlert />}
      tone={tone === 'danger' ? 'bad' : 'primary'}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        cancel.current?.focus();
      }}
      footer={
        <>
          <Button ref={cancel} tone="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Vazgeç
          </Button>
          <Button tone={tone} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
