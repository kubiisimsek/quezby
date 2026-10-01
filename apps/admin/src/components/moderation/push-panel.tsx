import type { AdminPlayerPush, AdminPlayerRef, AdminPushResult } from '@quezby/types';
import { BellRing, Logs, Send, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/base/button';
import { Field, TextField } from '@/components/base/field';
import { Modal } from '@/components/base/modal';
import { Panel } from '@/components/base/panel';
import { Tag } from '@/components/base/tag';
import { TextArea } from '@/components/base/text-area';
import { Callout } from '@/components/patterns/callout';
import { FormModal } from '@/components/patterns/form-modal';
import { usePlayerActions } from '@/hooks/api/players';
import { errorMessage, fieldErrors } from '@/lib/errors';
import { formatNumber, formatRelative, playerName, PUSH_PROBLEM } from '@/lib/format';

const PLATFORM_LABEL: Record<string, string> = { ios: 'iOS', android: 'Android' };

function platformOf(platform: string): string {
  return PLATFORM_LABEL[platform] ?? platform;
}

/** What a push from the panel did, phone by phone, as Firebase answered. */
function PushResultModal({ player, result, onClose }: { player: AdminPlayerRef; result: AdminPushResult; onClose: () => void }) {
  const problem = result.problem ? PUSH_PROBLEM[result.problem] : null;
  return (
    <Modal
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={problem ? 'Push gitmedi' : `${formatNumber(result.delivered)} / ${formatNumber(result.devices)} cihaza gitti`}
      description={playerName(player.username)}
      icon={<BellRing />}
      tone={problem || result.delivered === 0 ? 'bad' : result.delivered < result.devices ? 'warn' : 'ok'}
      size="md"
      footer={
        <>
          <Button asChild tone="ghost" icon={<Logs />}>
            <Link to={`/logs?player=${player.id}`}>Loglarda gör</Link>
          </Button>
          <Button tone="primary" onClick={onClose}>
            Kapat
          </Button>
        </>
      }
    >
      {problem ? (
        <Callout tone="bad" title={problem.title}>
          {problem.hint}
        </Callout>
      ) : (
        <>
          <ul aria-label="Cihazlar" className="divide-y divide-line-soft">
            {result.results.map((device) => (
              <li key={device.device} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <span className="min-w-0">
                  <span className="block text-body font-semibold text-ink">
                    {platformOf(device.platform)} <span className="font-mono text-meta font-medium text-ink-muted">{device.device}</span>
                  </span>
                  <span className="block break-words text-meta text-ink-muted">
                    {device.ok
                      ? 'Firebase kabul etti; gerisi Apple ya da Google’da.'
                      : (device.error ?? 'Firebase cevap vermedi.')}
                    {device.dropped ? ' Cihaz silindi.' : ''}
                  </span>
                </span>
                <Tag
                  tone={device.ok ? 'ok' : 'bad'}
                  label={device.ok ? 'Gitti' : device.status ? `Gitmedi · ${device.status}` : 'Gitmedi'}
                />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-meta text-ink-muted">
            “Gitti” Firebase’in kabul ettiği demek. Telefonda görünmüyorsa iOS’ta Firebase’deki APNs anahtarına, Android’de telefonun bildirim
            ayarına bak. Uygulama açıksa bildirim üstte oyunun şeridi olarak çıkar.
          </p>
        </>
      )}
    </Modal>
  );
}

function PushDialog({
  player,
  open,
  onOpenChange,
  onSent,
}: {
  player: AdminPlayerRef;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: (result: AdminPushResult) => void;
}) {
  const { push } = usePlayerActions(player.id);
  const fields = fieldErrors(push.error);

  return (
    <FormModal
      open={open}
      onOpenChange={(next) => {
        if (!next) push.reset();
        onOpenChange(next);
      }}
      title={`${playerName(player.username)} için push`}
      description="Şimdi, oyuncunun bütün cihazlarına gider — kapattığı türlere bakılmaz. Denetim kaydına yazılır."
      icon={<Send />}
      submitLabel="Gönder"
      loading={push.isPending}
      error={push.error && !fields.title && !fields.body ? errorMessage(push.error) : null}
      onSubmit={(data) =>
        push.mutate(
          { title: String(data.get('title') ?? '').trim(), body: String(data.get('body') ?? '').trim() },
          {
            onSuccess: (result) => {
              onOpenChange(false);
              onSent(result);
            },
          },
        )
      }
    >
      <TextField label="Başlık" name="title" defaultValue="Quezby" maxLength={60} required error={fields.title} />
      <Field label="Mesaj" hint="En fazla 240 karakter." error={fields.body} required>
        {(control) => (
          <TextArea {...control} name="body" defaultValue="Bu bir deneme bildirimi." maxLength={240} required invalid={Boolean(fields.body)} />
        )}
      </Field>
    </FormModal>
  );
}

/**
 * Whether the player's phones can get a push at all — what registered and
 * what they turned off — and, for an owner, a push sent now to see what
 * Firebase answers for each phone.
 */
export function PushPanel({ player, push, canSend }: { player: AdminPlayerRef; push: AdminPlayerPush; canSend: boolean }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<AdminPushResult | null>(null);
  const off = [
    push.settings.friends ? null : 'Arkadaşlık',
    push.settings.vs ? null : 'VS',
    push.settings.messages ? null : 'Mesajlar',
  ].filter((kind): kind is string => kind !== null);

  return (
    <Panel
      title="Push"
      description="Bildirim alabilecek cihazları ve kapattığı türler."
      icon={<BellRing />}
      tone="secondary"
      actions={
        canSend ? (
          <Button size="sm" tone="primary" icon={<Send />} onClick={() => setOpen(true)}>
            Push gönder
          </Button>
        ) : null
      }
    >
      {push.devices.length === 0 ? (
        <p className="text-meta text-ink-muted">
          Kayıtlı cihaz yok: oyuncu bildirime izin vermemiş ya da telefonun token’ı API’ye ulaşmamış. Ona push gitmez.
        </p>
      ) : (
        <ul aria-label="Push cihazları" className="space-y-2.5">
          {push.devices.map((device) => (
            <li key={device.device} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <Smartphone aria-hidden className="size-4 shrink-0 text-ink-faint" />
                <span className="min-w-0">
                  <span className="block truncate text-body font-semibold text-ink">
                    {platformOf(device.platform)}
                    {device.appVersion ? ` · ${device.appVersion}` : ''}
                  </span>
                  <span className="block font-mono text-micro text-ink-faint">{device.device}</span>
                </span>
              </span>
              <span className="shrink-0 text-meta text-ink-muted" title={device.registeredAt ?? undefined}>
                {formatRelative(device.updatedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {off.length === 0 ? <Tag tone="ok" label="Bütün türler açık" /> : off.map((kind) => <Tag key={kind} tone="warn" label={`${kind} kapalı`} />)}
      </div>
      {canSend ? <PushDialog player={player} open={open} onOpenChange={setOpen} onSent={setResult} /> : null}
      {result ? <PushResultModal player={player} result={result} onClose={() => setResult(null)} /> : null}
    </Panel>
  );
}
