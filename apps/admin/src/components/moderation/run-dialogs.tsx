import type { AdminRunRow } from '@quezby/types';
import { CircleCheck, CircleX } from 'lucide-react';
import { toast } from 'sonner';

import { Field } from '@/components/base/field';
import { TextArea } from '@/components/base/text-area';
import { ConfirmModal } from '@/components/patterns/confirm-modal';
import { FormModal } from '@/components/patterns/form-modal';
import { useRunActions } from '@/hooks/api/runs';
import { errorMessage, fieldErrors } from '@/lib/errors';
import { formatNumber, playerName, shortId } from '@/lib/format';

type DialogProps = {
  run: Pick<AdminRunRow, 'id' | 'player' | 'score'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
};

export function ApproveRunDialog({ run, open, onOpenChange, onDone }: DialogProps) {
  const { approve } = useRunActions(run.id);

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      tone="primary"
      icon={<CircleCheck />}
      title={`${playerName(run.player?.username)} · ${formatNumber(run.score)} sıralamaya girsin mi?`}
      description="Tur, oynandığı günün, haftanın, ayın ve sezonun tablolarına girer; oyuncunun istatistiklerine ve ligine sayılır."
      confirmLabel="Onayla"
      loading={approve.isPending}
      onConfirm={() =>
        approve.mutate(undefined, {
          onSuccess: ({ changed }) => {
            if (changed) toast.success('Tur onaylandı', { description: 'Skor tablolara girdi.' });
            else toast.info('Değişen bir şey yok: tur artık incelemede değil.');
            onOpenChange(false);
            onDone?.();
          },
          onError: (error) => toast.error(errorMessage(error)),
        })
      }
    />
  );
}

export function RejectRunDialog({ run, open, onOpenChange, onDone }: DialogProps) {
  const { reject } = useRunActions(run.id);
  const fields = fieldErrors(reject.error);

  return (
    <FormModal
      open={open}
      onOpenChange={(next) => {
        if (!next) reject.reset();
        onOpenChange(next);
      }}
      title={`Tur ${shortId(run.id)} reddedilsin mi?`}
      description="Tur hiçbir tabloya girmez; oyuncunun tabloları kalan turlarından yeniden kurulur. Tur silinmez, kayıtta kalır."
      icon={<CircleX />}
      tone="bad"
      submitLabel="Reddet"
      submitTone="danger"
      loading={reject.isPending}
      error={reject.error && !fields.reason ? errorMessage(reject.error) : null}
      onSubmit={(data) =>
        reject.mutate(String(data.get('reason') ?? '').trim(), {
          onSuccess: ({ changed }) => {
            if (changed) toast.success('Tur reddedildi', { description: 'Tablolar yeniden kuruldu.' });
            else toast.info('Değişen bir şey yok: bu tur reddedilemez.');
            onOpenChange(false);
            onDone?.();
          },
        })
      }
    >
      <Field label="Sebep" hint="Turun bayraklarına ve denetim kaydına yazılır. En az 3 karakter." error={fields.reason} required>
        {(control) => (
          <TextArea {...control} name="reason" placeholder="Ör. kararlar makine gibi düzenli, skor rekorun dört katı" maxLength={191} required invalid={Boolean(fields.reason)} />
        )}
      </Field>
    </FormModal>
  );
}
