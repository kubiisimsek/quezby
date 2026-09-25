import type { AdminLeagueStanding } from '@quezby/types';
import { ArrowDown, ArrowUp, CalendarRange, Medal, Users } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { Skeleton } from '@/components/base/skeleton';
import { Tag } from '@/components/base/tag';
import { BandStats } from '@/components/patterns/band-stats';
import { Callout } from '@/components/patterns/callout';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { Page } from '@/components/patterns/page';
import { useLeagueGroup } from '@/hooks/api/leagues';
import { PlayerCell } from '@/lib/columns';
import { errorMessage, isApiError } from '@/lib/errors';
import { formatDateTime, formatNumber, formatWeekKey, LEAGUE_OUTCOME, LEAGUE_TIER, LEAGUE_ZONE, playerName } from '@/lib/format';

const COLUMNS: Column<AdminLeagueStanding>[] = [
  { key: 'rank', header: 'Sıra', cell: (row) => `#${formatNumber(row.rank)}`, tone: 'strong', width: '4rem' },
  { key: 'player', header: 'Oyuncu', cell: (row) => <PlayerCell player={row.player} link /> },
  { key: 'points', header: 'Puan', cell: (row) => formatNumber(row.points), align: 'end', tone: 'strong' },
  { key: 'days', header: 'Gün', cell: (row) => `${formatNumber(row.daysPlayed)} / 7`, align: 'end', tone: 'muted', hideBelow: 'md' },
  { key: 'zone', header: 'Bölge', cell: (row) => <Tag {...LEAGUE_ZONE[row.zone]} /> },
  { key: 'outcome', header: 'Sonuç', cell: (row) => (row.outcome ? <Tag {...LEAGUE_OUTCOME[row.outcome]} /> : <span className="text-ink-faint">—</span>), hideBelow: 'lg' },
];

/** One league group's table, as its players see it — and how it ended, once it has. */
export function LeagueGroupPage() {
  const { groupId = '' } = useParams();
  const id = Number(groupId);
  const group = useLeagueGroup(id);

  if (group.isPending) {
    return (
      <Page title="Lig grubu" back={{ to: '/leagues', label: 'Ligler' }}>
        <Skeleton className="h-72 rounded-panel" />
      </Page>
    );
  }
  if (group.error || !group.data) {
    return (
      <Page title={isApiError(group.error, 'not_found') ? 'Grup bulunamadı' : 'Grup açılamadı'} back={{ to: '/leagues', label: 'Ligler' }}>
        <Callout tone="bad">{isApiError(group.error, 'not_found') ? 'Böyle bir lig grubu yok.' : errorMessage(group.error)}</Callout>
      </Page>
    );
  }

  const data = group.data;
  const tier = LEAGUE_TIER[data.group.tier];

  return (
    <Page
      title={`${tier} ligi · grup #${data.group.id}`}
      back={{ to: `/leagues?week=${data.group.weekKey}`, label: 'Ligler' }}
      description={`${formatDateTime(data.group.startsAt)} – ${formatDateTime(data.group.endsAt)}`}
      eyebrow={
        <>
          <Tag tone="onBrand" icon={<CalendarRange />} label={`${data.group.weekKey} · ${formatWeekKey(data.group.weekKey)}`} />
          <Tag tone="onBrand" label={data.group.settled ? 'Bitti' : 'Sürüyor'} />
        </>
      }
      band={
        <BandStats
          stats={[
            { label: 'Oyuncu', value: formatNumber(data.standings.length), icon: <Users /> },
            { label: 'Yükselecek', value: formatNumber(data.promoteCount), icon: <ArrowUp /> },
            { label: 'Düşecek', value: formatNumber(data.demoteCount), icon: <ArrowDown /> },
            { label: 'Lig', value: tier, icon: <Medal /> },
          ]}
        />
      }
    >
      {data.banned.length > 0 ? (
        <Callout tone="warn" title="Yasaklı üyeler tabloda yok">
          <p>{data.banned.map((player) => playerName(player.username)).join(', ')} bu gruba oturmuştu; yasaklı olduğu için sıralanmıyor ve yerinde kalıyor.</p>
        </Callout>
      ) : null}
      <DataTable
        title="Tablo"
        description="Puan: haftanın her gününün en iyi skoru, toplanmış. Eşitlikte önce katılan önde."
        icon={<Medal />}
        tone="secondary"
        columns={COLUMNS}
        rows={data.standings}
        rowKey={(row) => row.player.id}
        empty={{ title: 'Grupta sıralanan kimse yok', icon: <Users /> }}
      />
    </Page>
  );
}
