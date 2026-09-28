import type { AdminPlayerRef } from '@quezby/types';
import { Ban, FlagOff, ImageOff, KeyRound, LogOut, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Field, TextField } from '@/components/base/field';
import { TextArea } from '@/components/base/text-area';
import { ConfirmModal } from '@/components/patterns/confirm-modal';
import { FormModal } from '@/components/patterns/form-modal';
import { usePlayerActions } from '@/hooks/api/players';
import { errorMessage, fieldErrors } from '@/lib/errors';
import { playerName } from '@/lib/format';

type DialogProps = {
  player: AdminPlayerRef;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
};

/** The reason every moderation decision asks for — it goes to the audit log. */
function ReasonField({ error, placeholder }: { error?: string; placeholder: string }) {
  return (
    <Field label="Sebep" hint="Denetim kaydına yazılır. En az 3 karakter." error={error} required>
      {(control) => <TextArea {...control} name="reason" placeholder={placeholder} maxLength={191} required invalid={Boolean(error)} />}
    </Field>
  );
}

const reasonOf = (data: FormData) => String(data.get('reason') ?? '').trim();

export function BanPlayerDialog({ player, open, onOpenChange, onDone }: DialogProps) {
  const { ban } = usePlayerActions(player.id);
  const fields = fieldErrors(ban.error);

  return (
    <FormModal
      open={open}
      onOpenChange={(next) => {
        if (!next) ban.reset();
        onOpenChange(next);
      }}
      title={`${playerName(player.username)} yasaklansın mı?`}
      description="Oyuncu oynamaya devam eder ama hiçbir tabloda, ligde ya da aramada görünmez; bundan sonraki turları bayraklanır."
      icon={<Ban />}
      tone="bad"
      submitLabel="Yasakla"
      submitTone="danger"
      loading={ban.isPending}
      error={ban.error && !fields.reason ? errorMessage(ban.error) : null}
      onSubmit={(data) =>
        ban.mutate(reasonOf(data), {
          onSuccess: ({ changed }) => {
            if (changed) toast.success('Oyuncu yasaklandı', { description: 'Tablolardan çıkarıldı.' });
            else toast.info('Değişen bir şey yok: oyuncu zaten yasaklı.');
            onOpenChange(false);
            onDone?.();
          },
        })
      }
    >
      <ReasonField error={fields.reason} placeholder="Ör. hız hilesi: turların %40’ı 200 ms’nin altında" />
    </FormModal>
  );
}

export function UnbanPlayerDialog({ player, open, onOpenChange, onDone }: DialogProps) {
  const { unban } = usePlayerActions(player.id);

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      tone="primary"
      icon={<ShieldCheck />}
      title={`${playerName(player.username)} için yasak kalkıyor mu?`}
      description="Oyuncunun sıralamaya giren turları bu sezonun tablolarına geri döner."
      confirmLabel="Yasağı kaldır"
      loading={unban.isPending}
      onConfirm={() =>
        unban.mutate(undefined, {
          onSuccess: ({ changed }) => {
            if (changed) toast.success('Yasak kaldırıldı', { description: 'Turları tablolara döndü.' });
            else toast.info('Değişen bir şey yok: oyuncu yasaklı değil.');
            onOpenChange(false);
            onDone?.();
          },
          onError: (error) => toast.error(errorMessage(error)),
        })
      }
    />
  );
}

export function RenamePlayerDialog({ player, open, onOpenChange, onDone }: DialogProps) {
  const { rename } = usePlayerActions(player.id);
  const fields = fieldErrors(rename.error);

  return (
    <FormModal
      open={open}
      onOpenChange={(next) => {
        if (!next) rename.reset();
        onOpenChange(next);
      }}
      title={`${playerName(player.username)} adı sıfırlansın mı?`}
      description="Oyuncuya “guest” ve sekiz rakamdan oluşan otomatik bir ad verilir. Kendine bir kez daha ad seçebilir; o ad da kalıcıdır. Eski ad denetim kaydında kalır."
      icon={<RotateCcw />}
      tone="warn"
      submitLabel="Adı sıfırla"
      submitTone="danger"
      loading={rename.isPending}
      error={rename.error && !fields.reason ? errorMessage(rename.error) : null}
      onSubmit={(data) =>
        rename.mutate(reasonOf(data), {
          onSuccess: ({ username }) => {
            toast.success('Ad sıfırlandı', { description: `Yeni adı: @${username}` });
            onOpenChange(false);
            onDone?.();
          },
        })
      }
    >
      <ReasonField error={fields.reason} placeholder="Ör. küfürlü ad" />
    </FormModal>
  );
}

export function RemoveAvatarDialog({ player, open, onOpenChange, onDone }: DialogProps) {
  const { removeAvatar } = usePlayerActions(player.id);
  const fields = fieldErrors(removeAvatar.error);

  return (
    <FormModal
      open={open}
      onOpenChange={(next) => {
        if (!next) removeAvatar.reset();
        onOpenChange(next);
      }}
      title={`${playerName(player.username)} fotoğrafı kaldırılsın mı?`}
      description="Fotoğraf silinir, artık kimse göremez; oyuncu yeni bir fotoğraf yükleyebilir. Fotoğraf hakkındaki açık bildirimler kapanır."
      icon={<ImageOff />}
      tone="bad"
      submitLabel="Fotoğrafı kaldır"
      submitTone="danger"
      loading={removeAvatar.isPending}
      error={removeAvatar.error && !fields.reason ? errorMessage(removeAvatar.error) : null}
      onSubmit={(data) =>
        removeAvatar.mutate(reasonOf(data), {
          onSuccess: ({ changed }) => {
            if (changed) toast.success('Fotoğraf kaldırıldı', { description: 'Fotoğraf hakkındaki bildirimler kapandı.' });
            else toast.info('Değişen bir şey yok: oyuncunun fotoğrafı yok.');
            onOpenChange(false);
            onDone?.();
          },
        })
      }
    >
      <ReasonField error={fields.reason} placeholder="Ör. uygunsuz fotoğraf" />
    </FormModal>
  );
}

export function DismissReportsDialog({ player, open, onOpenChange, onDone }: DialogProps) {
  const { dismissReports } = usePlayerActions(player.id);
  const fields = fieldErrors(dismissReports.error);

  return (
    <FormModal
      open={open}
      onOpenChange={(next) => {
        if (!next) dismissReports.reset();
        onOpenChange(next);
      }}
      title={`${playerName(player.username)} hakkındaki bildirimler kapatılsın mı?`}
      description="Açık bildirimler işlem yapılmadan kapanır; fotoğraf ve ad olduğu gibi kalır."
      icon={<FlagOff />}
      tone="secondary"
      submitLabel="Bildirimleri kapat"
      loading={dismissReports.isPending}
      error={dismissReports.error && !fields.reason ? errorMessage(dismissReports.error) : null}
      onSubmit={(data) =>
        dismissReports.mutate(reasonOf(data), {
          onSuccess: ({ changed }) => {
            if (changed) toast.success('Bildirimler kapatıldı');
            else toast.info('Değişen bir şey yok: açık bildirim yoktu.');
            onOpenChange(false);
            onDone?.();
          },
        })
      }
    >
      <ReasonField error={fields.reason} placeholder="Ör. fotoğrafta kural dışı bir şey yok" />
    </FormModal>
  );
}

export function SignOutPlayerDialog({ player, open, onOpenChange, onDone }: DialogProps) {
  const { signOut } = usePlayerActions(player.id);

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      icon={<LogOut />}
      title={`${playerName(player.username)} tüm cihazlardan çıkarılsın mı?`}
      description="Oyuncunun her cihazdaki oturumu kapanır; hesabı durur, yeniden giriş yapması gerekir."
      confirmLabel="Oturumları kapat"
      loading={signOut.isPending}
      onConfirm={() =>
        signOut.mutate(undefined, {
          onSuccess: ({ changed }) => {
            if (changed) toast.success('Oturumlar kapandı');
            else toast.info('Açık oturum yoktu.');
            onOpenChange(false);
            onDone?.();
          },
          onError: (error) => toast.error(errorMessage(error)),
        })
      }
    />
  );
}

export function DeletePlayerDialog({ player, open, onOpenChange, onDone }: DialogProps) {
  const { remove } = usePlayerActions(player.id);
  const fields = fieldErrors(remove.error);
  const [typed, setTyped] = useState('');
  const name = player.username ?? '';

  return (
    <FormModal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          remove.reset();
          setTyped('');
        }
        onOpenChange(next);
      }}
      title={`${playerName(player.username)} hesabı silinsin mi?`}
      description="Bu geri alınamaz: hesap, bütün turları ve sıralamaları silinir. Denetim kaydında iz kalır."
      icon={<Trash2 />}
      tone="bad"
      submitLabel="Hesabı sil"
      submitTone="danger"
      loading={remove.isPending}
      error={remove.error && !fields.reason && !fields.confirm ? errorMessage(remove.error) : null}
      onSubmit={(data) =>
        remove.mutate(
          { reason: reasonOf(data), confirm: String(data.get('confirm') ?? '').trim() },
          {
            onSuccess: () => {
              toast.success('Hesap silindi');
              onOpenChange(false);
              onDone?.();
            },
          },
        )
      }
    >
      <ReasonField error={fields.reason} placeholder="Ör. oyuncu hesabının silinmesini istedi" />
      <TextField
        label={`Onaylamak için “${name}” yaz`}
        name="confirm"
        autoComplete="off"
        icon={<KeyRound />}
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        error={fields.confirm}
        required
      />
    </FormModal>
  );
}
