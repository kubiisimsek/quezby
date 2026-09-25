import type { AdminRunRow } from '@quezby/types';
import {
  Activity,
  Ban,
  CalendarDays,
  Gamepad2,
  Hourglass,
  ShieldAlert,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/base/button';
import { Panel } from '@/components/base/panel';
import { Skeleton } from '@/components/base/skeleton';
import { Tag } from '@/components/base/tag';
import { BandStats } from '@/components/patterns/band-stats';
import { BarChart } from '@/components/patterns/bar-chart';
import { Callout } from '@/components/patterns/callout';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { Page } from '@/components/patterns/page';
import { ShareList } from '@/components/patterns/share-list';
import { Stats } from '@/components/patterns/stats';
import { useOverview } from '@/hooks/api/overview';
import { FlagTags, PlayerCell } from '@/lib/columns';
import { errorMessage } from '@/lib/errors';
import { formatDayKey, formatNumber, formatRelative, RUN_FLAG, shortId } from '@/lib/format';

const QUEUE_COLUMNS: Column<AdminRunRow>[] = [
  { key: 'player', header: 'Oyuncu', cell: (run) => <PlayerCell player={run.player} /> },
  { key: 'score', header: 'Skor', cell: (run) => formatNumber(run.score), align: 'end', tone: 'strong' },
  { key: 'flags', header: 'Sinyal', cell: (run) => <FlagTags flags={run.flags} max={1} />, hideBelow: 'md' },
];

/** The front page: how the game is doing today, the last thirty days, and what needs a person. */
export function OverviewPage() {
  const overview = useOverview();

  if (overview.isPending) {
    return (
      <Page title="Genel bakış" description="Oyunun bugünü ve son 30 günü.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-28 rounded-panel" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-panel" />
      </Page>
    );
  }
  if (overview.error || !overview.data) {
    return (
      <Page title="Genel bakış">
        <Callout tone="bad" title="Veri alınamadı">
          {errorMessage(overview.error)}
        </Callout>
      </Page>
    );
  }

  const { kpis, series, topFlags, queue, today, dailyNumber, season } = overview.data;

  return (
    <Page
      title="Genel bakış"
      description="Oyunun bugünü, son 30 günü ve bir insanın bakması gerekenler."
      eyebrow={
        <>
          <Tag tone="onBrand" icon={<CalendarDays />} label={formatDayKey(today)} />
          <Tag tone="onBrand" label={`Günün akışı #${formatNumber(dailyNumber)}`} />
          <Tag tone="onBrand" label={`Sezon ${season}`} />
        </>
      }
      band={
        <BandStats
          stats={[
            { label: 'Oyuncu', value: formatNumber(kpis.players), icon: <Users /> },
            { label: 'Bugün oynayan', value: formatNumber(kpis.activeToday), icon: <Activity /> },
            { label: 'Bugünkü tur', value: formatNumber(kpis.runsToday), icon: <Gamepad2 /> },
            { label: 'İncelemede', value: formatNumber(kpis.review), icon: <Hourglass />, alert: kpis.review > 0 },
            { label: 'Yasaklı', value: formatNumber(kpis.banned), icon: <Ban /> },
          ]}
        />
      }
    >
      <Stats
        stats={[
          { label: 'Bugün katılan', value: formatNumber(kpis.newToday), icon: <UserPlus />, tone: 'secondary', hint: 'Yeni hesap' },
          { label: 'Sıralamaya giren', value: formatNumber(kpis.rankedToday), icon: <Trophy />, tone: 'ok', hint: 'Bugün biten turlar' },
          { label: 'Bugün bayraklanan', value: formatNumber(kpis.flaggedToday), icon: <ShieldAlert />, tone: kpis.flaggedToday > 0 ? 'bad' : 'neutral', hint: 'Sert sinyal ya da ret' },
          { label: 'Günün akışı', value: formatNumber(kpis.dailyPlayers), icon: <CalendarDays />, tone: 'primary', hint: 'Bugün oynayan' },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          <Panel title="Turlar · son 30 gün" description="Biten turlar; bayraklananlar kırmızıyla üstte." icon={<Gamepad2 />}>
            <BarChart
              label="Son 30 günün turları"
              labels={series.days}
              formatLabel={formatDayKey}
              series={[
                { label: 'Temiz', tone: 'primary', values: series.runs.map((runs, index) => Math.max(0, runs - (series.flagged[index] ?? 0))) },
                { label: 'Bayraklı', tone: 'bad', values: series.flagged },
              ]}
            />
          </Panel>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel title="Oynayan oyuncular" description="Günde en az bir tur bitiren." icon={<Activity />} tone="secondary">
              <BarChart label="Son 30 günün oynayan oyuncuları" labels={series.days} formatLabel={formatDayKey} series={[{ label: 'Oynayan', tone: 'secondary', values: series.activePlayers }]} />
            </Panel>
            <Panel title="Yeni oyuncular" description="Günde açılan hesap." icon={<UserPlus />} tone="ok">
              <BarChart label="Son 30 günün yeni oyuncuları" labels={series.days} formatLabel={formatDayKey} series={[{ label: 'Yeni', tone: 'ok', values: series.newPlayers }]} />
            </Panel>
          </div>
        </div>

        <div className="space-y-6">
          <DataTable
            title="İnceleme kuyruğu"
            description={queue.length > 0 ? 'En yüksek skor önce.' : undefined}
            icon={<Hourglass />}
            tone="warn"
            columns={QUEUE_COLUMNS}
            rows={queue}
            rowKey={(run) => run.id}
            rowTo={(run) => `/runs/${run.id}`}
            rowLabel={(run) => `Tur ${shortId(run.id)} aç`}
            empty={{ title: 'Kuyruk boş', hint: 'Bekleyen zirve skor yok.', icon: <Hourglass /> }}
            actions={
              <Button asChild size="sm" tone="ghost">
                <Link to="/suspects">Tümü</Link>
              </Button>
            }
          />
          <Panel title="Bu haftanın sinyalleri" description="Son 7 günün turlarına konan bayraklar." icon={<ShieldAlert />} tone="bad">
            {topFlags.length > 0 ? (
              <ShareList
                label="Bu haftanın sinyalleri"
                items={topFlags.slice(0, 8).map((flag) => ({
                  key: flag.code,
                  label: RUN_FLAG[flag.code]?.label ?? flag.code,
                  hint: flag.severity === 'hard' ? 'sert' : 'yumuşak',
                  count: flag.count,
                  tone: flag.severity === 'hard' ? 'bad' : 'warn',
                }))}
              />
            ) : (
              <p className="text-meta text-ink-muted">Son 7 günde hiçbir tura bayrak konmadı.</p>
            )}
          </Panel>
          <p className="px-1 text-micro text-ink-faint">Son güncelleme {formatRelative(overview.data.serverTime)}</p>
        </div>
      </div>
    </Page>
  );
}
