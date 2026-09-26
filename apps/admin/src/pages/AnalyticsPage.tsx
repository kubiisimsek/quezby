import type { AdminAnalytics, AdminDeviceSlice } from '@quezby/types';
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

import { Panel } from '@/components/base/panel';
import { Segmented } from '@/components/base/segmented';
import { Skeleton } from '@/components/base/skeleton';
import { Tag } from '@/components/base/tag';
import { BandStats } from '@/components/patterns/band-stats';
import { BarChart } from '@/components/patterns/bar-chart';
import { Callout } from '@/components/patterns/callout';
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
          <Devices devices={data.devices} />
          <Storage storage={data.storage} />
          <p className="px-1 text-micro text-ink-faint">Son güncelleme {formatRelative(data.serverTime)}</p>
        </div>
      </div>
    </Page>
  );
}

/** Every player's phones seen in the last week — the device registry, consent or not. */
function Devices({ devices }: { devices: AdminAnalytics['devices'] }) {
  const slices = (items: AdminDeviceSlice[], name: string) =>
    items.map((item) => ({
      key: `${item.platform ?? '-'}|${item.value ?? '-'}`,
      label: `${item.platform ? PLATFORM[item.platform] : 'Bilinmiyor'} ${item.value ?? '—'}`,
      count: item.devices,
      rate: item.share,
      hint: name,
    }));

  return (
    <Panel title="Cihazlar · son 7 gün" description={`${formatNumber(devices.total)} telefon; izin verip vermediğine bakmadan, oyunun çalışması için.`} icon={<MonitorSmartphone />}>
      {devices.total > 0 ? (
        <div className="space-y-5">
          <FunnelList label="Uygulama sürümleri" numbered={false} tone="secondary" steps={slices(devices.versions, 'sürüm')} />
          <FunnelList label="Sistemler" numbered={false} tone="secondary" steps={slices(devices.systems, 'sistem')} />
          <FunnelList
            label="Modeller"
            numbered={false}
            tone="secondary"
            steps={devices.models.map((item) => ({
              key: `${item.platform ?? '-'}|${item.value ?? '-'}`,
              label: item.value ?? 'Bilinmiyor',
              hint: item.platform ? PLATFORM[item.platform] : undefined,
              count: item.devices,
              rate: item.share,
            }))}
          />
        </div>
      ) : (
        <p className="text-meta text-ink-muted">Son 7 günde görülen telefon yok.</p>
      )}
    </Panel>
  );
}

/** What analytics keeps, layer by layer, and for how long. */
function Storage({ storage }: { storage: AdminAnalytics['storage'] }) {
  const tier = (tier: AdminAnalytics['storage']['visits']) =>
    `${formatNumber(tier.rows)} satır · en eski ${formatDate(tier.oldest)}`;
  const keep = (days: number | null) => (days === null ? 'Süresiz; günde birkaç düzine satır' : `${formatNumber(days)} gün tutulur`);

  return (
    <Panel title="Veri hacmi" description="Budama kendiliğinden, saatte bir parça; Sistem’den elle de çalışır." icon={<Database />}>
      <Facts
        facts={[
          { label: 'Ziyaretler', value: tier(storage.visits), hint: keep(storage.visits.keepDays) },
          { label: 'Oyuncu günleri', value: tier(storage.days), hint: keep(storage.days.keepDays) },
          { label: 'Günlük toplamlar', value: tier(storage.totals), hint: keep(storage.totals.keepDays) },
          { label: 'Cihaz kaydı', value: tier(storage.devices), hint: storage.devices.keepDays === null ? undefined : `${formatNumber(storage.devices.keepDays)} gün görülmeyen silinir` },
          { label: 'İlkler', value: `${formatNumber(storage.milestones)} satır` },
          { label: 'Geri çevrilen', value: formatNumber(storage.dropped), hint: 'Son 7 gün: bayat, bilinmeyen ya da sınırı aşan' },
        ]}
      />
    </Panel>
  );
}

function formatSeconds(seconds: number | null): string {
  return seconds === null ? '—' : formatDuration(seconds * 1000);
}
