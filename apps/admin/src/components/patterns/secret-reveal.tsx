import { Check, Copy, KeyRound } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/base/button';
import { Modal } from '@/components/base/modal';

/**
 * A temporary password, shown this once on the logo's gradient, with a way
 * to copy it. The panel never stores it; closing the dialog forgets it.
 */
export function SecretReveal({
  open,
  onClose,
  title,
  description,
  secret,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  secret: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setCopied(false);
          onClose();
        }
      }}
      title={title}
      description={description}
      icon={<KeyRound />}
      tone="primary"
      footer={
        <Button tone="primary" onClick={onClose}>
          Tamam, kaydettim
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel bg-brand-wash p-4 text-on-brand shadow-brand">
          <code data-testid="secret" className="select-all break-all font-mono text-title tracking-[0.12em]">
            {secret}
          </code>
          <Button tone="onBrandSoft" size="sm" icon={copied ? <Check /> : <Copy />} onClick={() => void copy()}>
            {copied ? 'Kopyalandı' : 'Kopyala'}
          </Button>
        </div>
        <p className="text-meta text-ink-muted">
          Bu şifre bir daha gösterilmeyecek. Yöneticiye güvenli bir yoldan ilet; ilk girişte kendi şifresini seçmesi istenecek.
        </p>
      </div>
    </Modal>
  );
}
