import type { AdminAnalytics } from '@quezby/types';
import {
  Activity,
  CalendarRange,
  ChartLine,
  Clock,
  Database,
  Footprints,
  MonitorSmartphone,
  Radio,
  Repeat,
  Route,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';

import { DeviceTable } from '@/components/analytics/device-table';
import { Panel } from '@/components/base/panel';
import { Segmented } from '@/components/base/segmented';
import { Skeleton } from '@/components/base/skeleton';
import { Tag } from '@/components/base/tag';
import { BandStats } from '@/components/patterns/band-stats';
import { BarChart } from '@/components/patterns/bar-chart';
import { Callout } from '@/components/patterns/callout';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { Facts } from '@/components/patterns/facts';
import { FunnelList } from '@/components/patterns/funnel-list';
import { Page } from '@/components/patterns/page';
import { RetentionTable } from '@/components/patterns/retention-table';
import { ShareList } from '@/components/patterns/share-list';
import { Stats } from '@/components/patterns/stats';
import { useAnalytics } from '@/hooks/api/analytics';
import { useListParams } from '@/hooks/useListParams';
import { errorMessage } from '@/lib/errors';
import {
  ANALYTICS_EVENT,
  ANALYTICS_SCREEN,
  deviceBrand,
  formatDate,
  formatDayKey,
  formatDuration,
  formatNumber,
  formatPerMille,
  formatRelative,
  formatWeekKey,
  FUNNEL_STEP,
  PLATFORM,
} from '@/lib/format';

type Window = '30' | '90';

/**
 * How the game is used: who comes and comes back, how long they stay, where
 * they go, what their phones are — and what analytics keeps, so its growth
 * shows. Everything but the phones and "Şu an bağlı" is of the players who
 * said yes to usage analytics; every rate is the API's.
 */
export function AnalyticsPage() {
  const { params, set } = useListParams({ days: '30' });
  const window: Window = params.days === '90' ? '90' : '30';
  const analytics = useAnalytics({ days: window === '90' ? 90 : 30 });

  const tabs = (
    <Segmented<Window>
      kind="choice"
      aria-label="Dönem"
      value={window}
      onChange={(value) => set({ days: value })}
      options={[
        { value: '30', label: 'Son 30 gün' },
        { value: '90', label: 'Son 90 gün' },
      ]}
    />
  );

  if (analytics.isPending) {
    return (
      <Page title="Analitik" description="Oyunun nasıl kullanıldığı." tabs={tabs}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-28 rounded-panel" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-panel" />
      </Page>
    );
  }
  if (analytics.error || !analytics.data) {
    return (
      <Page title="Analitik" tabs={tabs}>
        <Callout tone="bad" title="Veri alınamadı">
          {errorMessage(analytics.error)}
        </Callout>
      </Page>
    );
  }

  const data = analytics.data;
  const { series } = data;
  const last = series.days.length - 1;

  return (
    <Page
      title="Analitik"
      description="Kim geliyor, ne kadar kalıyor, nereye bakıyor. Cihazlar ve “şu an bağlı” dışında her sayı, kullanım verisine izin veren oyunculardan."
      eyebrow={
        <>
          <Tag tone="onBrand" icon={<ShieldCheck />} label={`İzin veren ${formatPerMille(data.consent.rate)}`} />
          {data.collecting.sample < 1000 ? <Tag tone="onBrand" label={`Örneklem ${formatPerMille(data.collecting.sample)}`} /> : null}
          <Tag tone="onBrand" label={formatDayKey(data.today)} />
        </>
      }
      band={
        <BandStats
          stats={[
            { label: 'Şu an bağlı', value: formatNumber(data.now.online), icon: <Radio /> },
            { label: 'Bugün aktif', value: formatNumber(data.now.active), icon: <Activity /> },
            { label: '7 günde aktif', value: formatNumber(data.now.weekly), icon: <CalendarRange /> },
            { label: '30 günde aktif', value: formatNumber(data.now.monthly), icon: <Users /> },
            { label: 'Yapışkanlık', value: formatPerMille(data.now.stickiness), icon: <Repeat /> },
          ]}
        />
      }
      tabs={tabs}
    >
      {data.collecting.enabled ? null : (
        <Callout tone="bad" title="Analitik kapalı">
          QUEZBY_ANALYTICS_ENABLED kapalı: şu an kimsenin kullanım verisi tutulmuyor. Aşağıdakiler kapanmadan öncesine ait.
        </Callout>
      )}

      <Stats
        stats={[
          { label: 'Ortalama ziyaret', value: formatSeconds(series.avgVisitSeconds[last] ?? null), icon: <Clock />, tone: 'secondary', hint: 'Bugün, ön planda geçen süre' },
          { label: 'Bugünkü ziyaret', value: formatNumber(series.visits[last] ?? 0), icon: <Footprints />, tone: 'secondary', hint: 'Uygulamanın her açılışı' },
          { label: 'Bugün yeni', value: formatNumber(series.newcomers[last] ?? 0), icon: <UserPlus />, tone: 'ok', hint: 'İlk gününde açanlar' },
          {
            label: 'Yeni oyuncuda izin',
            value: formatPerMille(data.consent.newRate),
            icon: <UserCheck />,
            tone: 'ok',
            hint: `${formatNumber(data.consent.newGranted)} / ${formatNumber(data.consent.newPlayers)} · son ${data.days} gün`,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          <Panel title="Aktif oyuncular" description="Günde en az bir kez açan; ilk gününde olanlar yeşil." icon={<Activity />} tone="secondary">
            <BarChart
              label="Günlük aktif oyuncular"
              labels={series.days}
              formatLabel={formatDayKey}
              series={[
                { label: 'Dönen', tone: 'secondary', values: series.returning },
                { label: 'Yeni', tone: 'ok', values: series.newcomers },
              ]}
            />
          </Panel>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel title="Ziyaretler" description="Uygulamanın ön plana her gelişi." icon={<Footprints />} tone="secondary">
              <BarChart label="Günlük ziyaretler" labels={series.days} formatLabel={formatDayKey} series={[{ label: 'Ziyaret', tone: 'secondary', values: series.visits }]} />
            </Panel>
            <Panel title="Oyunda geçen süre" description="Ön planda geçen dakikalar, hepsi birden." icon={<Clock />} tone="secondary">
              <BarChart label="Günlük dakikalar" labels={series.days} formatLabel={formatDayKey} series={[{ label: 'Dakika', tone: 'secondary', values: series.minutes }]} />
            </Panel>
          </div>
          <Panel
            title="Geri dönüş"
            description="İlk gününde açan yeni oyuncular, katıldıkları haftaya göre: kaçı 1., 3., 7., 14. ve 30. günde döndü."
            icon={<Repeat />}
            tone="ok"
          >
            {data.retention.some((row) => row.players > 0) ? (
              <RetentionTable rows={data.retention} label="Haftalık geri dönüş" formatWeek={formatWeekKey} />
            ) : (
              <p className="text-meta text-ink-muted">Henüz ilk gününden izlenen yeni oyuncu yok.</p>
            )}
          </Panel>
          <Panel
            title="İlk adımlar"
            description={`Son ${data.days} günde katılan ve ilk gününde açan oyuncular; oranlar katılanlardan.`}
            icon={<Route />}
            tone="ok"
          >
            {data.funnel[0] && data.funnel[0].players > 0 ? (
              <FunnelList
                label="İlk adımlar"
                steps={data.funnel.map((step) => ({
                  key: step.step,
                  label: FUNNEL_STEP[step.step].label,
                  hint: FUNNEL_STEP[step.step].hint,
                  count: step.players,
                  rate: step.rate,
                }))}
              />
            ) : (
              <p className="text-meta text-ink-muted">Bu dönemde ilk gününden izlenen yeni oyuncu yok.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Ekranlar" description={`Son ${data.days} günde açılışları.`} icon={<ChartLine />} tone="secondary">
            {data.screens.length > 0 ? (
              <ShareList
                label="Ekranlar"
                items={data.screens.map((screen) => ({
                  key: screen.screen,
                  label: ANALYTICS_SCREEN[screen.screen],
                  count: screen.views,
                  tone: 'secondary',
                }))}
              />
            ) : (
              <p className="text-meta text-ink-muted">Henüz ekran sayılmadı.</p>
            )}
          </Panel>
          <Panel title="Anlar" description={`Son ${data.days} günde kaç kez.`} icon={<Sparkles />} tone="secondary">
            {data.events.length > 0 ? (
              <Facts
                facts={data.events.map((event) => ({
                  label: ANALYTICS_EVENT[event.event].label,
                  value: formatNumber(event.count),
                }))}
              />
            ) : (
              <p className="text-meta text-ink-muted">Henüz bir an sayılmadı.</p>
            )}
          </Panel>
        </div>
      </div>

      <Devices devices={data.devices} />
      <Storage storage={data.storage} />
      <p className="px-1 text-micro text-ink-faint">Son güncelleme {formatRelative(data.serverTime)}</p>
    </Page>
  );
}

/**
 * Every player's phones seen in the last week — the device registry, consent
 * or not — in one card: a table per system, then a table per big maker and
 * one for the other makers.
 */
function Devices({ devices }: { devices: AdminAnalytics['devices'] }) {
  return (
    <Panel
      title="Cihazlar"
      description={devices.total > 0 ? `Son 7 günde görülen ${formatNumber(devices.total)} telefon; izin aranmaz.` : 'Son 7 gün; izin aranmaz.'}
      icon={<MonitorSmartphone />}
    >
      {devices.total > 0 ? (
        <div className="space-y-6">
          {devices.platforms.length > 0 ? (
            <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
              {devices.platforms.map((platform) => (
                <DeviceTable
                  key={platform.platform}
                  title={PLATFORM[platform.platform]}
                  header="Sürüm"
                  table={platform}
                  name={(row) => (row.value === null ? 'Sürümü bilinmeyen' : `${PLATFORM[platform.platform]} ${row.value}`)}
                />
              ))}
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-x-10 gap-y-6 border-t border-line-soft pt-6 first:border-t-0 first:pt-0 md:grid-cols-2">
            {devices.brands.map((brand) => (
              <DeviceTable
                key={brand.brand ?? '—'}
                title={deviceBrand(brand.brand)}
                note={brand.brand === null ? 'Uygulamanın eski sürümü markayı göndermiyor.' : undefined}
                header="Model"
                table={brand}
                name={(row) => row.value ?? 'Modeli bilinmeyen'}
              />
            ))}
            {devices.otherBrands.devices > 0 ? (
              <DeviceTable title="Diğer markalar" header="Marka" table={devices.otherBrands} name={(row) => deviceBrand(row.value)} />
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-meta text-ink-muted">Son 7 günde görülen telefon yok.</p>
      )}
    </Panel>
  );
}

type Layer = { key: string; label: string; rows: number; oldest: string | null; keep: string };

/** What analytics keeps, layer by layer, and for how long — at the foot of the page. */
function Storage({ storage }: { storage: AdminAnalytics['storage'] }) {
  const kept = (days: number | null) => (days === null ? 'Süresiz; günde birkaç düzine satır' : `${formatNumber(days)} gün`);
  const layers: Layer[] = [
    { key: 'visits', label: 'Ziyaretler', rows: storage.visits.rows, oldest: storage.visits.oldest, keep: kept(storage.visits.keepDays) },
    { key: 'days', label: 'Oyuncu günleri', rows: storage.days.rows, oldest: storage.days.oldest, keep: kept(storage.days.keepDays) },
    { key: 'totals', label: 'Günlük toplamlar', rows: storage.totals.rows, oldest: storage.totals.oldest, keep: kept(storage.totals.keepDays) },
    {
      key: 'devices',
      label: 'Cihaz kaydı',
      rows: storage.devices.rows,
      oldest: storage.devices.oldest,
      keep: storage.devices.keepDays === null ? 'Süresiz' : `${formatNumber(storage.devices.keepDays)} gün görülmeyen silinir`,
    },
    { key: 'milestones', label: 'İlkler', rows: storage.milestones, oldest: null, keep: 'Hesap silinince ya da izin geri alınınca' },
  ];
  const columns: Column<Layer>[] = [
    { key: 'label', header: 'Katman', cell: (layer) => layer.label, tone: 'strong' },
    { key: 'rows', header: 'Satır', cell: (layer) => <span className="tabular">{formatNumber(layer.rows)}</span>, align: 'end' },
    { key: 'oldest', header: 'En eski', cell: (layer) => formatDate(layer.oldest), tone: 'muted', hideBelow: 'md' },
    { key: 'keep', header: 'Ne kadar kalır', cell: (layer) => layer.keep, tone: 'muted' },
  ];

  return (
    <DataTable
      title="Veri hacmi"
      description="Budama kendiliğinden, saatte bir parça; Sistem’den elle de çalışır."
      icon={<Database />}
      columns={columns}
      rows={layers}
      rowKey={(layer) => layer.key}
      empty={{ title: 'Analitik henüz bir şey tutmuyor' }}
      footer={
        <p className="text-meta text-ink-muted">
          Son 7 günde geri çevrilen: <span className="font-semibold text-ink tabular">{formatNumber(storage.dropped)}</span>. Bayat,
          bilinmeyen ya da sınırı aşan ziyaret ve kodlar.
        </p>
      }
    />
  );
}

function formatSeconds(seconds: number | null): string {
  return seconds === null ? '—' : formatDuration(seconds * 1000);
}
