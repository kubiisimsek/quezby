import type { AdminLeagueGroupRow, LeagueTier } from '@quezby/types';
import { Medal } from 'lucide-react';

import { Picker } from '@/components/base/picker';
import { Tag } from '@/components/base/tag';
import { BandStats } from '@/components/patterns/band-stats';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { FilterChips } from '@/components/patterns/filter-chips';
import { Page } from '@/components/patterns/page';
import { Pager } from '@/components/patterns/pager';
import { useLeagues } from '@/hooks/api/leagues';
import { useListParams } from '@/hooks/useListParams';
import { When } from '@/lib/columns';
import { formatNumber, formatWeekKey, LEAGUE_TIER, LEAGUE_TIERS } from '@/lib/format';

type TierChip = 'all' | LeagueTier;

const COLUMNS: Column<AdminLeagueGroupRow>[] = [
  { key: 'group', header: 'Grup', cell: (group) => `#${group.id}`, tone: 'mono' },
  { key: 'tier', header: 'Lig', cell: (group) => <Tag tone="secondary" icon={<Medal />} label={LEAGUE_TIER[group.tier]} /> },
  { key: 'members', header: 'Oyuncu', cell: (group) => `${formatNumber(group.members)} / 30`, align: 'end', tone: 'strong' },
  { key: 'state', header: 'Durum', cell: (group) => (group.settled ? <Tag tone="ok" label="Bitti" /> : <Tag tone="primary" label="Sürüyor" />) },
  { key: 'opened', header: 'Açıldı', cell: (group) => <When at={group.createdAt} as="date" />, tone: 'muted', hideBelow: 'md' },
];

/** The weekly leagues: a week's groups by tier, each one's table a click away. */
export function LeaguesPage() {
  const { params, page, set, setPage } = useListParams({ week: '', tier: 'all' });
  const tier = params.tier as TierChip;
  const leagues = useLeagues({ week: params.week || undefined, tier: tier === 'all' ? undefined : tier, page });
  const data = leagues.data;

  return (
    <Page
      title="Ligler"
      description="Haftalık ligler: 30 kişilik gruplar, puan her günün en iyi skorunun toplamı; hafta bitince en iyiler yükselir, en kötüler düşer."
      band={
        <BandStats
          stats={LEAGUE_TIERS.map((one) => ({
            label: `${LEAGUE_TIER[one]} oyuncusu`,
            value: data ? formatNumber(data.tiers[one]) : '…',
            icon: <Medal />,
          }))}
        />
      }
    >
      <DataTable
        title={data ? `${data.weekKey} · ${formatWeekKey(data.weekKey)}` : 'Bu hafta'}
        description="En üst lig önce."
        icon={<Medal />}
        tone="secondary"
        columns={COLUMNS}
        rows={data?.items ?? []}
        rowKey={(group) => String(group.id)}
        rowTo={(group) => `/leagues/${group.id}`}
        rowLabel={(group) => `Grup #${group.id} tablosunu aç`}
        isLoading={leagues.isPending}
        isFetching={leagues.isFetching}
        error={leagues.error}
        toolbar={
          <>
            <FilterChips<TierChip>
              aria-label="Lig"
              value={tier}
              onChange={(value) => set({ tier: value })}
              chips={[
                { value: 'all', label: 'Tümü' },
                ...LEAGUE_TIERS.filter((one) => one === tier || !data || data.tiers[one] > 0).map((one) => ({ value: one, label: LEAGUE_TIER[one] })),
              ]}
            />
            {data && data.weeks.length > 0 ? (
              <div className="sm:ml-auto">
                <Picker<string>
                  compact
                  aria-label="Hafta"
                  value={data.weekKey}
                  onChange={(value) => set({ week: value })}
                  options={data.weeks.map((week) => ({ value: week, label: `${week} · ${formatWeekKey(week)}` }))}
                />
              </div>
            ) : null}
          </>
        }
        empty={{ title: 'Bu hafta grup yok', hint: 'Oyuncular haftanın ilk sıralı turunda bir gruba oturur.', icon: <Medal /> }}
        footer={data ? <Pager page={data.page} perPage={data.perPage} total={data.total} onPage={setPage} noun="grup" /> : undefined}
      />
    </Page>
  );
}
