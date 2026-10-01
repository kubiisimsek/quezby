import type { AdminPushCampaign, Locale } from '@quezby/types';
import { BellRing, Plus, Send, Square } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/base/button';
import { Meter } from '@/components/base/meter';
import { Tag, type TagTone } from '@/components/base/tag';
import { BandStats } from '@/components/patterns/band-stats';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { Page } from '@/components/patterns/page';
import { usePushActions, usePushCampaigns, usePushRunner } from '@/hooks/api/push';
import { When } from '@/lib/columns';
import { formatNumber } from '@/lib/format';
import { describeFilters } from '@/lib/push';

const STATUS: Record<AdminPushCampaign['status'], { tone: TagTone; label: string }> = {
  sending: { tone: 'warn', label: 'Gidiyor' },
  done: { tone: 'ok', label: 'Bitti' },
  stopped: { tone: 'neutral', label: 'Durduruldu' },
};

const COLUMNS: Column<AdminPushCampaign>[] = [
  { key: 'at', header: 'Zaman', cell: (campaign) => <When at={campaign.createdAt} />, tone: 'muted' },
  {
    key: 'message',
    header: 'Bildirim',
    cell: (campaign) => {
      const words = campaign.messages[campaign.fallback];
      const languages = Object.keys(campaign.messages) as Locale[];
      return (
        <span className="block min-w-0 max-w-96">
          <span dir="auto" className="block truncate font-semibold text-ink">
            {words?.title}
          </span>
          <span dir="auto" className="block line-clamp-2 text-meta text-ink-muted">
            {words?.body}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-1">
            {languages.map((locale) => (
              <Tag key={locale} tone={locale === campaign.fallback ? 'secondary' : 'neutral'} label={locale.toUpperCase()} />
            ))}
          </span>
        </span>
      );
    },
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
          <Meter value={campaign.devices === 0 ? 1 : done / campaign.devices} tone={campaign.failed > 0 ? 'warn' : 'ok'} label={`Bildirim ${campaign.id}`} />
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
 * The pushes sent from the panel, newest first, and the way to a new one.
 * A push still going out moves on a batch of phones at a time while this
 * page is open (cron does it when it is not).
 */
export function PushPage() {
  const campaigns = usePushCampaigns();
  const { stop, put } = usePushActions();
  usePushRunner(campaigns.data?.campaigns, put);
  const list = campaigns.data?.campaigns ?? [];
  const sending = list.filter((campaign) => campaign.status === 'sending').length;

  return (
    <Page
      title="Push bildirimleri"
      description="Oyunculara gönderilen bildirimler: kime, hangi dillerde, kaçı gitti ve Firebase ne dedi."
      actions={
        <Button asChild tone="onBrand" icon={<Plus />}>
          <Link to="/push/new">Yeni bildirim</Link>
        </Button>
      }
      band={
        <BandStats
          stats={[
            { label: 'Gönderilen', value: formatNumber(list.length), icon: <BellRing /> },
            { label: 'Şu an gidiyor', value: formatNumber(sending), icon: <Send />, alert: sending > 0 },
          ]}
        />
      }
    >
      <DataTable
        title="Gönderilenler"
        description="Son 20 bildirim, yeniden eskiye"
        icon={<BellRing />}
        columns={COLUMNS}
        rows={list}
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
        empty={{
          title: 'Henüz bildirim gönderilmedi',
          hint: 'İlk bildirimi yaz, kime gideceğini seç, önizle ve gönder.',
          icon: <BellRing />,
          action: (
            <Button asChild tone="primary" icon={<Plus />}>
              <Link to="/push/new">Yeni bildirim</Link>
            </Button>
          ),
        }}
      />
    </Page>
  );
}
