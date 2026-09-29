import type { AdminCalibrationResponse, AdminRatingRow, AdminRatingsResponse } from '@quezby/types';
import { BookOpen, Crown, Hash, Hourglass, Medal, SlidersHorizontal, Target, Trophy } from 'lucide-react';

import { Panel } from '@/components/base/panel';
import { Segmented } from '@/components/base/segmented';
import { Skeleton } from '@/components/base/skeleton';
import { Rank } from '@/components/boards/board-table';
import { BandStats } from '@/components/patterns/band-stats';
import { Callout } from '@/components/patterns/callout';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { Facts } from '@/components/patterns/facts';
import { Page } from '@/components/patterns/page';
import { ShareList } from '@/components/patterns/share-list';
import { Stats } from '@/components/patterns/stats';
import { useCalibration, useRatings } from '@/hooks/api/ratings';
import { useListParams } from '@/hooks/useListParams';
import { PlayerCell, TierTag, When } from '@/lib/columns';
import { errorMessage } from '@/lib/errors';
import { formatNumber, formatPercent, LEAGUE_TIER, LEAGUE_TIERS } from '@/lib/format';

type Window = '7' | '14' | '30' | '90';

const WINDOWS: Window[] = ['7', '14', '30', '90'];

type TargetRow = AdminRatingsResponse['rules']['targets'][number];
type Anchor = AdminCalibrationResponse['anchors'][number];

/** The highest ratings, in the API's order: the row's place is its rank. */
const TOP_COLUMNS: Column<AdminRatingRow>[] = [
  { key: 'rank', header: 'Sıra', cell: (_row, index) => <Rank rank={index + 1} />, width: '6rem' },
  { key: 'player', header: 'Oyuncu', cell: (row) => <PlayerCell player={row.player} link /> },
  { key: 'tier', header: 'Lig', cell: (row) => <TierTag tier={row.tier} />, hideBelow: 'md' },
  { key: 'rating', header: 'Reyting', cell: (row) => formatNumber(row.rating), align: 'end', tone: 'strong' },
  { key: 'difficulty', header: 'Zorluk', cell: (row) => formatNumber(row.difficulty), align: 'end', tone: 'muted', hideBelow: 'lg' },
  { key: 'peak', header: 'En yüksek', cell: (row) => formatNumber(row.peak), align: 'end', tone: 'muted', hideBelow: 'lg' },
  { key: 'rated', header: 'Son sayılan', cell: (row) => <When at={row.ratedAt} />, tone: 'muted', hideBelow: 'xl' },
];

const TARGET_COLUMNS: Column<TargetRow>[] = [
  { key: 'rating', header: 'Reyting', cell: (row) => formatNumber(row.rating), tone: 'strong' },
  { key: 'score', header: 'Hedef skor', cell: (row) => formatNumber(row.score), align: 'end' },
];

const ANCHOR_COLUMNS: Column<Anchor>[] = [
  { key: 'rating', header: 'Reyting', cell: (row) => formatNumber(row.rating), tone: 'strong' },
  { key: 'current', header: 'Bugünkü hedef', cell: (row) => formatNumber(row.current), align: 'end', tone: 'muted' },
  { key: 'proposed', header: 'Önerilen', cell: (row) => formatNumber(row.proposed), align: 'end', tone: 'strong' },
];

/**
 * The ratings: how many players sit in each league and how many of them play,
 * the highest fifty, the rules they run on — and how well the target table
 * fits the players, with the table that would hold the leagues' shares. The
 * panel changes none of it: a new table is a config change.
 */
export function RatingsPage() {
  const ratings = useRatings();

  if (ratings.isPending) {
    return (
      <Page title="Reytingler" description="Liglerin oyuncuları, en yüksek reytingler ve kurallar.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-28 rounded-panel" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-panel" />
      </Page>
    );
  }
  if (ratings.error || !ratings.data) {
    return (
      <Page title="Reytingler">
        <Callout tone="bad" title="Veri alınamadı">
          {errorMessage(ratings.error)}
        </Callout>
      </Page>
    );
  }

  const data = ratings.data;
  const leader = data.top[0];

  return (
    <Page
      title="Reytingler"
      description="Her sayılan tur bir hedefe karşı oynanır: geçen reyting kazanır, kalan kaybeder. Oyuncunun ligi reytinginden gelir."
      band={
        <BandStats
          stats={[
            { label: 'Yerleşmede', value: formatNumber(data.placing), icon: <Hourglass /> },
            { label: 'Lider reyting', value: leader ? formatNumber(leader.rating) : '—', icon: <Crown /> },
            { label: 'Sezon', value: formatNumber(data.rules.engineVersion), icon: <Hash /> },
          ]}
        />
      }
    >
      <Stats
        className="xl:grid-cols-3 2xl:grid-cols-6"
        stats={LEAGUE_TIERS.map((tier) => ({
          label: LEAGUE_TIER[tier],
          value: formatNumber(data.tiers[tier]),
          hint: `${formatNumber(data.active[tier])} son ${data.rules.activeDays} günde oynadı`,
          icon: tier === 'master' ? <Crown /> : <Medal />,
          tone: 'secondary',
        }))}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <DataTable
          title="En yüksek 50"
          description="Yasaklılar dışında; eşitlikte o reytinge önce ulaşan önde."
          icon={<Trophy />}
          tone="secondary"
          columns={TOP_COLUMNS}
          rows={data.top}
          rowKey={(row) => row.player.id}
          className="xl:self-start"
          empty={{
            title: 'Henüz yerleşen yok',
            hint: `Oyuncular ilk ${formatNumber(data.rules.placementRuns)} sayılan turlarından sonra yerleşir.`,
            icon: <Trophy />,
          }}
        />
        <div className="space-y-6">
          <Rules rules={data.rules} />
          <DataTable
            title="Hedef tablosu"
            description="Bir reytingin kendi zorluğundaki tipik skoru: tur bunu geçerse reyting artar. Yerleşme turları zorluk 0'ın tablosuyla ölçülür."
            icon={<Target />}
            tone="secondary"
            columns={TARGET_COLUMNS}
            rows={data.rules.targets}
            rowKey={(row) => String(row.rating)}
            empty={{ title: 'Bu zorluk tablosunun hedefleri yok', hint: 'config’de rating.difficulty.targets altında bu sezona ve zorluk tablosuna bir tablo gerekir.', icon: <Target /> }}
          />
        </div>
      </div>

      <Calibration />
    </Page>
  );
}

/** The numbers the ratings run on, as `config/quezby.php` sets them. */
function Rules({ rules }: { rules: AdminRatingsResponse['rules'] }) {
  return (
    <Panel title="Kurallar" description="config/quezby.php › rating" icon={<BookOpen />} tone="secondary">
      <Facts
        facts={[
          { label: 'Tek turda en fazla', value: `±${formatNumber(rules.maxDelta)} Elo` },
          {
            label: 'Genişlik',
            value: formatNumber(rules.width),
            hint: `Geçici dönemde ${formatNumber(rules.provisionalWidth)}: değişimler daha büyük`,
          },
          { label: 'Geçici dönem', value: `${formatNumber(rules.provisionalRuns)} tur`, hint: 'Yerleştikten sonra ve uzun aradan dönünce' },
          {
            label: 'Yerleşme',
            value: `${formatNumber(rules.placementRuns)} tur`,
            hint: `${formatNumber(rules.placementMin)} ile ${formatNumber(rules.placementMax)} arasına`,
          },
          { label: 'Terfi kalkanı', value: `${formatNumber(rules.shieldRuns)} tur`, hint: 'Yeni yükselen bu turlarda ligden düşmez' },
          { label: 'Bronz’da kayıp', value: formatPercent(rules.bronzeLossPercent), hint: 'Kaybın bu kadarı düşer' },
          { label: 'Dereceli kilidi', value: `${formatNumber(rules.unlockRuns)} oyun`, hint: 'Normal ya da Günlük oyun' },
          {
            label: 'Zorluk',
            value: `0–${formatNumber(rules.maxDifficulty)}`,
            hint: `${formatNumber(rules.difficultyFrom)} Elo’dan sonra her ${formatNumber(rules.difficultyStep)} Elo’da bir artar · tablo ${formatNumber(rules.difficultyVersion)}`,
          },
        ]}
      />
    </Panel>
  );
}

/**
 * How today's target table fits the players who played enough in a window:
 * the league each one's median settles in beside the share each league
 * should hold, and the anchors that would hold them. Nothing changes here.
 */
function Calibration() {
  const { params, set } = useListParams({ days: '30' });
  const window: Window = WINDOWS.find((one) => one === params.days) ?? '30';
  const calibration = useCalibration({ days: Number(window) });
  const data = calibration.data;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Panel
        title="Kalibrasyon"
        description="Oyuncuların medyan skoru bugünkü hedef tablosuyla hangi lige oturuyor."
        icon={<SlidersHorizontal />}
        tone="secondary"
        toolbar={
          <Segmented<Window>
            kind="choice"
            aria-label="Kalibrasyon dönemi"
            value={window}
            onChange={(value) => set({ days: value })}
            options={WINDOWS.map((one) => ({ value: one, label: `${one} gün` }))}
          />
        }
        className="xl:self-start"
      >
        {calibration.isPending ? (
          <Skeleton className="h-56 rounded-panel" />
        ) : calibration.error || !data ? (
          <Callout tone="bad" title="Veri alınamadı">
            {errorMessage(calibration.error)}
          </Callout>
        ) : (
          <div className="space-y-5">
            <Callout tone="info" title="Hiçbir şey değişmez">
              <p>Tablo config’de değişir (config/quezby.php › rating.difficulty.targets); burası yalnızca bugünkü tablonun, zorluk tablosu {formatNumber(data.difficultyVersion)} ile oynanan dereceli turlara ne kadar uyduğunu gösterir.</p>
            </Callout>
            <Facts
              facts={[
                {
                  label: 'Ölçülen oyuncu',
                  value: formatNumber(data.players),
                  hint: `Son ${formatNumber(data.days)} günde en az ${formatNumber(data.minRuns)} sayılan turu olan`,
                },
              ]}
            />
            {data.players > 0 ? (
              <ShareList
                label="Bugünkü tabloyla oturdukları lig"
                items={LEAGUE_TIERS.map((tier) => ({
                  key: tier,
                  label: LEAGUE_TIER[tier],
                  hint: `istenen ${formatPercent(data.shares[tier])}`,
                  count: data.settled[tier],
                  tone: 'secondary',
                }))}
              />
            ) : (
              <p className="text-meta text-ink-muted">Bu dönemde yeterince oynayan oyuncu yok: ölçülecek kimse çıkmadı.</p>
            )}
          </div>
        )}
      </Panel>
      <DataTable
        title="Önerilen hedefler"
        description="Liglerin istenen paylarını tutacak hedef skorlar, bugünkülerin yanında."
        icon={<Target />}
        tone="secondary"
        columns={ANCHOR_COLUMNS}
        rows={data?.anchors ?? []}
        rowKey={(row) => String(row.rating)}
        isLoading={calibration.isPending}
        isFetching={calibration.isFetching}
        error={calibration.error}
        className="xl:self-start"
        empty={{ title: 'Bu zorluk tablosunun hedefleri yok', hint: 'config’de rating.difficulty.targets altında bu sezona ve zorluk tablosuna bir tablo gerekir.', icon: <Target /> }}
      />
    </div>
  );
}
