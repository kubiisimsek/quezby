import type { AdminReportRow, AdminReportStatus, ReportReason } from '@quezby/types';
import { Flag } from 'lucide-react';

import { Segmented } from '@/components/base/segmented';
import { Tag } from '@/components/base/tag';
import { BandStats } from '@/components/patterns/band-stats';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { Page } from '@/components/patterns/page';
import { Pager } from '@/components/patterns/pager';
import { useCounts } from '@/hooks/api/counts';
import { useReports } from '@/hooks/api/reports';
import { useListParams } from '@/hooks/useListParams';
import { PlayerCell, When } from '@/lib/columns';
import { formatNumber, REPORT_REASON, REPORT_STATUS } from '@/lib/format';

const STATUSES = Object.keys(REPORT_STATUS) as AdminReportStatus[];
const REASONS = Object.keys(REPORT_REASON) as ReportReason[];

/** Each list's heading, and what its emptiness means. */
const LIST: Record<AdminReportStatus, { title: string; empty: { title: string; hint: string } }> = {
  open: {
    title: 'Açık bildirimler',
    empty: { title: 'Açık bildirim yok', hint: 'Oyuncular birinin fotoğrafını ya da adını bildirdiğinde burada görünür.' },
  },
  resolved: {
    title: 'Giderilen bildirimler',
    empty: { title: 'Giderilen bildirim yok', hint: 'Bir fotoğraf kaldırıldığında ya da bir ad sıfırlandığında bildirimleri burada görünür.' },
  },
  dismissed: {
    title: 'Kapatılan bildirimler',
    empty: { title: 'Kapatılan bildirim yok', hint: 'Bir moderatör bildirimleri işlem yapmadan kapattığında burada görünür.' },
  },
};

function columns(status: AdminReportStatus): Column<AdminReportRow>[] {
  return [
    { key: 'player', header: 'Oyuncu', cell: (row) => <PlayerCell player={row.player} avatarUrl={row.avatarUrl} /> },
    {
      key: 'reasons',
      header: 'Ne için',
      cell: (row) => (
        <span className="flex flex-wrap gap-1">
          {REASONS.filter((reason) => row.reasons[reason] > 0).map((reason) => (
            <Tag key={reason} tone={REPORT_STATUS[status].tone} label={`${REPORT_REASON[reason]} ×${formatNumber(row.reasons[reason])}`} />
          ))}
        </span>
      ),
    },
    { key: 'reports', header: 'Bildirim', cell: (row) => formatNumber(row.reports), align: 'end', tone: 'strong' },
    { key: 'first', header: 'İlk bildirim', cell: (row) => <When at={row.firstAt} />, tone: 'muted', hideBelow: 'lg' },
    { key: 'last', header: 'Son bildirim', cell: (row) => <When at={row.lastAt} />, tone: 'muted', hideBelow: 'md' },
  ];
}

/**
 * What players reported about each other's photos and names, a row per
 * reported player. The decision is made on the player's page, where the
 * photo and the name can be seen: take the photo down, reset the name, or
 * let the reports go.
 */
export function ReportsPage() {
  const { params, page, set, setPage } = useListParams({ status: 'open' });
  const status: AdminReportStatus = STATUSES.includes(params.status as AdminReportStatus) ? (params.status as AdminReportStatus) : 'open';

  const counts = useCounts();
  const reports = useReports({ status, page });

  return (
    <Page
      title="Bildirimler"
      description="Oyuncuların birbirinin fotoğrafı ve kullanıcı adı için yaptığı bildirimler. Bir satır oyuncunun sayfasını açar; karar orada verilir."
      band={
        <BandStats
          stats={[
            {
              label: 'Açık bildirimi olan oyuncu',
              value: counts.data ? formatNumber(counts.data.reports) : '…',
              icon: <Flag />,
              alert: (counts.data?.reports ?? 0) > 0,
            },
          ]}
        />
      }
    >
      <DataTable
        title={LIST[status].title}
        description={REPORT_STATUS[status].hint}
        icon={<Flag />}
        tone={status === 'open' ? 'warn' : 'secondary'}
        columns={columns(status)}
        rows={reports.data?.items ?? []}
        rowKey={(row) => row.player?.id ?? `${row.firstAt}-${row.lastAt}`}
        rowTo={(row) => (row.player ? `/players/${row.player.id}` : null)}
        rowLabel={(row) => `${row.player?.username ?? 'Adsız oyuncu'} sayfasını aç`}
        rowMuted={(row) => row.player !== null && row.player.bannedAt !== null}
        isLoading={reports.isPending}
        isFetching={reports.isFetching}
        error={reports.error}
        toolbar={
          <Segmented<AdminReportStatus>
            kind="choice"
            aria-label="Durum"
            value={status}
            onChange={(value) => set({ status: value })}
            options={STATUSES.map((value) => ({ value, label: REPORT_STATUS[value].label }))}
          />
        }
        empty={{ ...LIST[status].empty, icon: <Flag /> }}
        footer={reports.data ? <Pager page={reports.data.page} perPage={reports.data.perPage} total={reports.data.total} onPage={setPage} noun="oyuncu" /> : undefined}
      />
    </Page>
  );
}
