import type { AdminPushCampaign, AdminPushFilters, LeagueTier, Locale, Platform } from '@quezby/types';
import { BellRing, Filter, History, Send, Smartphone, Square, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/base/button';
import { Checkbox } from '@/components/base/checkbox';
import { Field, TextField } from '@/components/base/field';
import { Meter } from '@/components/base/meter';
import { Panel } from '@/components/base/panel';
import { Picker } from '@/components/base/picker';
import { Segmented } from '@/components/base/segmented';
import { Tag, type TagTone } from '@/components/base/tag';
import { TextArea } from '@/components/base/text-area';
import { Callout } from '@/components/patterns/callout';
import { ConfirmModal } from '@/components/patterns/confirm-modal';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { Facts } from '@/components/patterns/facts';
import { Page } from '@/components/patterns/page';
import { usePushActions, usePushAudience, usePushCampaigns, usePushRunner } from '@/hooks/api/push';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { When } from '@/lib/columns';
import { errorMessage, fieldErrors } from '@/lib/errors';
import { formatNumber, LEAGUE_TIER, LEAGUE_TIERS, LOCALE_LABEL } from '@/lib/format';

type TierChoice = LeagueTier | 'none';
type DailyChoice = 'any' | 'played' | 'not_played';
type PlayedChoice = 'any' | `within:${number}` | `idle:${number}`;
type JoinedChoice = 'any' | `${number}`;
type PlatformChoice = 'any' | Platform;
type AccountChoice = 'any' | 'guest' | 'registered';

const LOCALES = Object.keys(LOCALE_LABEL) as Locale[];

const PLAYED_OPTIONS: { value: PlayedChoice; label: string }[] = [
  { value: 'any', label: 'Fark etmez' },
  { value: 'within:1', label: 'Son 24 saatte oynadı' },
  { value: 'within:3', label: 'Son 3 günde oynadı' },
  { value: 'within:7', label: 'Son 7 günde oynadı' },
  { value: 'within:30', label: 'Son 30 günde oynadı' },
  { value: 'idle:3', label: '3 gündür oynamadı' },
  { value: 'idle:7', label: '7 gündür oynamadı' },
  { value: 'idle:14', label: '14 gündür oynamadı' },
  { value: 'idle:30', label: '30 gündür oynamadı' },
];

const JOINED_OPTIONS: { value: JoinedChoice; label: string }[] = [
  { value: 'any', label: 'Fark etmez' },
  { value: '1', label: 'Son 24 saatte katıldı' },
  { value: '7', label: 'Son 7 günde katıldı' },
  { value: '30', label: 'Son 30 günde katıldı' },
  { value: '90', label: 'Son 90 günde katıldı' },
];

type Choices = {
  username: string;
  tiers: TierChoice[];
  daily: DailyChoice;
  played: PlayedChoice;
  joined: JoinedChoice;
  platform: PlatformChoice;
  locales: Locale[];
  account: AccountChoice;
};

const NO_CHOICE: Choices = { username: '', tiers: [], daily: 'any', played: 'any', joined: 'any', platform: 'any', locales: [], account: 'any' };

/** What the form says, as the API's filters — the empty ones left out. */
export function filtersOf(choices: Choices): AdminPushFilters {
  const filters: AdminPushFilters = {};
  const username = choices.username.trim().replace(/^@/, '');
  if (username) filters.username = username;
  if (choices.tiers.length > 0) filters.tiers = choices.tiers;
  if (choices.daily !== 'any') filters.daily = choices.daily;
  if (choices.played.startsWith('within:')) filters.playedWithinDays = Number(choices.played.slice(7));
  if (choices.played.startsWith('idle:')) filters.notPlayedForDays = Number(choices.played.slice(5));
  if (choices.joined !== 'any') filters.joinedWithinDays = Number(choices.joined);
  if (choices.platform !== 'any') filters.platform = choices.platform;
  if (choices.locales.length > 0) filters.locales = choices.locales;
  if (choices.account !== 'any') filters.account = choices.account;
  return filters;
}

/** The filters in words: "Elmas, Ligi yok · Bugün oynamadı · iOS". */
export function describeFilters(filters: AdminPushFilters): string {
  const parts = [
    filters.username ? `@${filters.username}` : null,
    filters.tiers?.map((tier) => (tier === 'none' ? 'Ligi yok' : LEAGUE_TIER[tier])).join(', '),
    filters.daily === 'played' ? 'Bugün Günün akışını oynadı' : filters.daily === 'not_played' ? 'Bugün Günün akışını oynamadı' : null,
    filters.playedWithinDays ? `Son ${filters.playedWithinDays} günde oynadı` : null,
    filters.notPlayedForDays ? `${filters.notPlayedForDays} gündür oynamadı` : null,
    filters.joinedWithinDays ? `Son ${filters.joinedWithinDays} günde katıldı` : null,
    filters.platform === 'ios' ? 'iOS' : filters.platform === 'android' ? 'Android' : null,
    filters.locales?.map((locale) => LOCALE_LABEL[locale]).join(', '),
    filters.account === 'guest' ? 'Misafir' : filters.account === 'registered' ? 'Kayıtlı' : null,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' · ') : 'Herkes';
}

const STATUS: Record<AdminPushCampaign['status'], { tone: TagTone; label: string }> = {
  sending: { tone: 'warn', label: 'Gidiyor' },
  done: { tone: 'ok', label: 'Bitti' },
  stopped: { tone: 'neutral', label: 'Durduruldu' },
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((one) => one !== value) : [...list, value];
}

const COLUMNS: Column<AdminPushCampaign>[] = [
  { key: 'at', header: 'Zaman', cell: (campaign) => <When at={campaign.createdAt} />, tone: 'muted' },
  {
    key: 'message',
    header: 'Mesaj',
    cell: (campaign) => (
      <span className="block min-w-0 max-w-80">
        <span className="block truncate font-semibold text-ink">{campaign.title}</span>
        <span className="block line-clamp-2 text-meta text-ink-muted">{campaign.body}</span>
      </span>
    ),
  },
  {
    key: 'to',
    header: 'Kime',
    cell: (campaign) => <span className="line-clamp-2 max-w-64">{describeFilters(campaign.filters)}</span>,
    tone: 'muted',
    hideBelow: 'lg',
  },
  { key: 'status', header: 'Durum', cell: (campaign) => <Tag tone={STATUS[campaign.status].tone} label={STATUS[campaign.status].label} /> },
  {
    key: 'progress',
    header: 'Gitti',
    cell: (campaign) => {
      const done = campaign.sent + campaign.failed;
      return (
        <span className="block min-w-36 space-y-1.5">
          <span className="block text-meta text-ink-muted tabular">
            <span className="font-semibold text-ink">{formatNumber(campaign.sent)}</span> / {formatNumber(campaign.devices)} cihaz
            {campaign.failed > 0 ? <span className="text-bad-text"> · {formatNumber(campaign.failed)} gitmedi</span> : null}
          </span>
          <Meter value={campaign.devices === 0 ? 1 : done / campaign.devices} tone={campaign.failed > 0 ? 'warn' : 'ok'} label={`Kampanya ${campaign.id}`} />
        </span>
      );
    },
  },
  {
    key: 'errors',
    header: 'Firebase ne dedi',
    cell: (campaign) =>
      campaign.errors.length === 0 ? (
        '—'
      ) : (
        <span className="line-clamp-2 max-w-72 break-words" title={campaign.errors.map((one) => `${one.count}× ${one.error}`).join('\n')}>
          {campaign.errors[0]?.count}× {campaign.errors[0]?.error}
        </span>
      ),
    tone: 'muted',
    hideBelow: 'xl',
  },
];

/**
 * Pushes from the panel: the words, who they go to — by league, today's
 * Günün akışı, when they last played or joined, phone, language, account —
 * how many that is before sending, and every push sent, going out a batch of
 * phones at a time while this page is open (and by cron when it is not).
 */
export function PushPage() {
  const [choices, setChoices] = useState<Choices>(NO_CHOICE);
  const [title, setTitle] = useState('Quezby');
  const [body, setBody] = useState('');
  const [confirming, setConfirming] = useState(false);
  const set = (change: Partial<Choices>) => setChoices((current) => ({ ...current, ...change }));

  const filters = useMemo(() => filtersOf(choices), [choices]);
  const settled = useDebouncedValue(filters, 300);
  const audience = usePushAudience(settled);
  const campaigns = usePushCampaigns();
  const { send, stop, put } = usePushActions();
  usePushRunner(campaigns.data?.campaigns, put);
  const fields = fieldErrors(send.error);
  const count = audience.data;

  const submit = () =>
    send.mutate(
      { title: title.trim(), body: body.trim(), filters },
      {
        onSuccess: ({ campaign }) => {
          setConfirming(false);
          toast.success(campaign.devices === 0 ? 'Gönderilecek cihaz yok' : `${formatNumber(campaign.devices)} cihaza gidiyor`);
        },
        onError: () => setConfirming(false),
      },
    );

  return (
    <Page
      title="Push bildirimi"
      description="Oyunculara push gönder: lige, bugünkü Günün akışına, son oyununa, katılımına, telefonuna, diline ve hesabına göre süz. Gönderilen her push denetim kaydına yazılır."
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          <Panel title="Kime" description="Her filtre daraltır. Yasaklı oyuncular hiç seçilmez." icon={<Filter />} tone="secondary">
            <div className="space-y-6">
              <TextField
                label="Tek oyuncu"
                hint="Boş bırakırsan filtrelere uyan herkes."
                placeholder="@kullanıcı"
                value={choices.username}
                onChange={(event) => set({ username: event.target.value })}
                maxLength={33}
              />

              <fieldset>
                <legend className="mb-2 text-micro text-ink-faint">Lig (Dereceli)</legend>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {[...LEAGUE_TIERS, 'none' as const].map((tier) => (
                    <Checkbox
                      key={tier}
                      label={tier === 'none' ? 'Ligi yok' : LEAGUE_TIER[tier]}
                      checked={choices.tiers.includes(tier)}
                      onChange={() => set({ tiers: toggle(choices.tiers, tier) })}
                    />
                  ))}
                </div>
              </fieldset>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Bugünkü Günün akışı">
                  {() => (
                    <Segmented<DailyChoice>
                      kind="choice"
                      aria-label="Bugünkü Günün akışı"
                      value={choices.daily}
                      onChange={(daily) => set({ daily })}
                      options={[
                        { value: 'any', label: 'Fark etmez' },
                        { value: 'played', label: 'Oynadı' },
                        { value: 'not_played', label: 'Oynamadı' },
                      ]}
                    />
                  )}
                </Field>
                <Field label="Telefon">
                  {() => (
                    <Segmented<PlatformChoice>
                      kind="choice"
                      aria-label="Telefon"
                      value={choices.platform}
                      onChange={(platform) => set({ platform })}
                      options={[
                        { value: 'any', label: 'Hepsi' },
                        { value: 'ios', label: 'iOS' },
                        { value: 'android', label: 'Android' },
                      ]}
                    />
                  )}
                </Field>
                <Field label="Son oyun">
                  {() => <Picker<PlayedChoice> aria-label="Son oyun" value={choices.played} onChange={(played) => set({ played })} options={PLAYED_OPTIONS} />}
                </Field>
                <Field label="Katılım">
                  {() => <Picker<JoinedChoice> aria-label="Katılım" value={choices.joined} onChange={(joined) => set({ joined })} options={JOINED_OPTIONS} />}
                </Field>
                <Field label="Hesap">
                  {() => (
                    <Segmented<AccountChoice>
                      kind="choice"
                      aria-label="Hesap"
                      value={choices.account}
                      onChange={(account) => set({ account })}
                      options={[
                        { value: 'any', label: 'Hepsi' },
                        { value: 'registered', label: 'Kayıtlı' },
                        { value: 'guest', label: 'Misafir' },
                      ]}
                    />
                  )}
                </Field>
              </div>

              <fieldset>
                <legend className="mb-2 text-micro text-ink-faint">Dil</legend>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {LOCALES.map((locale) => (
                    <Checkbox
                      key={locale}
                      label={LOCALE_LABEL[locale]}
                      checked={choices.locales.includes(locale)}
                      onChange={() => set({ locales: toggle(choices.locales, locale) })}
                    />
                  ))}
                </div>
              </fieldset>

              <div className="flex justify-end">
                <Button tone="ghost" size="sm" onClick={() => setChoices(NO_CHOICE)}>
                  Filtreleri temizle
                </Button>
              </div>
            </div>
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          <Panel title="Alıcılar" description={describeFilters(settled)} icon={<Users />} tone="secondary">
            {audience.error ? (
              <Callout tone="bad">{errorMessage(audience.error)}</Callout>
            ) : (
              <Facts
                facts={[
                  { label: 'Filtreye uyan oyuncu', value: count ? formatNumber(count.players) : '…' },
                  { label: 'Push alabilecek oyuncu', value: count ? formatNumber(count.reachable) : '…', hint: 'Bildirime izin verip cihazı kayıtlı olanlar.' },
                  { label: 'Cihaz', value: count ? formatNumber(count.devices) : '…', hint: count ? `iOS ${formatNumber(count.ios)} · Android ${formatNumber(count.android)}` : undefined },
                ]}
              />
            )}
          </Panel>

          <Panel title="Mesaj" description="Oyuncunun kilit ekranında böyle görünür." icon={<BellRing />}>
            <form
              className="space-y-4"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                setConfirming(true);
              }}
            >
              {send.error && !fields.title && !fields.body ? <Callout tone="bad">{errorMessage(send.error)}</Callout> : null}
              <TextField label="Başlık" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={60} required error={fields.title} />
              <Field label="Mesaj" hint={`${body.length} / 240`} error={fields.body} required>
                {(control) => (
                  <TextArea
                    {...control}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    maxLength={240}
                    required
                    invalid={Boolean(fields.body)}
                    placeholder="Ör. Bugünün akışı seni bekliyor!"
                  />
                )}
              </Field>
              <Button
                type="submit"
                tone="primary"
                icon={<Send />}
                className="w-full"
                disabled={!title.trim() || !body.trim() || (count?.devices ?? 0) === 0}
              >
                {count && count.devices > 0 ? `${formatNumber(count.devices)} cihaza gönder` : 'Gönderilecek cihaz yok'}
              </Button>
            </form>
          </Panel>
        </div>
      </div>

      <DataTable
        title="Gönderilenler"
        description="Sayfa açıkken gönderim 100'er cihaz ilerler; kapanırsa cron sürdürür."
        icon={<History />}
        columns={COLUMNS}
        rows={campaigns.data?.campaigns ?? []}
        rowKey={(campaign) => String(campaign.id)}
        isLoading={campaigns.isPending}
        error={campaigns.error}
        rowActions={(campaign) =>
          campaign.status === 'sending' ? (
            <Button size="sm" tone="ghost" icon={<Square />} loading={stop.isPending && stop.variables === campaign.id} onClick={() => stop.mutate(campaign.id)}>
              Durdur
            </Button>
          ) : null
        }
        empty={{ title: 'Henüz push gönderilmedi', hint: 'Yukarıda filtreleri seç, mesajı yaz, gönder.', icon: <Smartphone /> }}
      />

      <ConfirmModal
        open={confirming}
        onOpenChange={setConfirming}
        tone="primary"
        icon={<Send />}
        title={`${formatNumber(count?.reachable ?? 0)} oyuncunun ${formatNumber(count?.devices ?? 0)} cihazına gönderilsin mi?`}
        description={`${describeFilters(filters)} — “${title.trim()}: ${body.trim()}” Gönderilen push geri alınamaz.`}
        confirmLabel="Gönder"
        loading={send.isPending}
        onConfirm={submit}
      />
    </Page>
  );
}
