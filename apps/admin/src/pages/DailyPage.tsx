import type { AdminBoardKey } from '@quezby/types';
import { CalendarDays, Crown, Hash, Users } from 'lucide-react';

import { BoardTable } from '@/components/boards/board-table';
import { BandStats } from '@/components/patterns/band-stats';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { Page } from '@/components/patterns/page';
import { useBoard, useBoardKeys } from '@/hooks/api/boards';
import { useListParams } from '@/hooks/useListParams';
import { formatChallenge, formatChallengeDay, formatDayKey, formatNumber } from '@/lib/format';

const DAY_COLUMNS: Column<AdminBoardKey>[] = [
  { key: 'number', header: '#', cell: (day) => formatChallenge(day.number), tone: 'strong', width: '4rem' },
  { key: 'day', header: 'Gün', cell: (day) => formatDayKey(day.key) },
  { key: 'players', header: 'Sıralamada', cell: (day) => formatNumber(day.players), align: 'end' },
  { key: 'attempts', header: 'Deneme', cell: (day) => formatNumber(day.attempts), align: 'end', tone: 'muted', hideBelow: 'md' },
];

/**
 * "Günün akışı": the one run a day everyone plays on the same seed. Every
 * day with how many played it, and any day's board.
 */
export function DailyPage() {
  const { params, page, setPage } = useListParams({ day: '' });
  const days = useBoardKeys({ board: 'challenge', limit: 60 });
  const day = params.day || days.data?.keys[0]?.key || '';
  const board = useBoard({ board: 'challenge', key: day || undefined, page }, { enabled: day !== '' });
  const chosen = days.data?.keys.find((one) => one.key === day);

  return (
    <Page
      title="Günün akışı"
      description="Her gün herkesin aynı tohumla oynadığı tek tur. Bir gün seç, o günün tablosunu gör."
      band={
        <BandStats
          stats={[
            { label: 'Gün', value: chosen ? formatChallenge(chosen.number) : '…', icon: <Hash /> },
            { label: chosen ? formatDayKey(chosen.key) : 'Sıralamada', value: chosen ? formatNumber(chosen.players) : '…', icon: <Users /> },
            { label: 'Deneme', value: chosen ? formatNumber(chosen.attempts) : '…', icon: <CalendarDays /> },
            { label: 'Lider skor', value: chosen ? formatNumber(chosen.topScore) : '…', icon: <Crown /> },
          ]}
        />
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[26rem_minmax(0,1fr)]">
        <DataTable
          title="Günler"
          description="En yeni önce."
          icon={<CalendarDays />}
          columns={DAY_COLUMNS}
          rows={days.data?.keys ?? []}
          rowKey={(one) => one.key}
          rowTo={(one) => `/daily?day=${one.key}`}
          rowLabel={(one) => `${formatDayKey(one.key)} tablosunu aç`}
          rowMuted={(one) => one.players === 0}
          isLoading={days.isPending}
          error={days.error}
          className="xl:self-start"
          empty={{ title: 'Henüz gün yok', hint: 'Günün akışı ilk oynandığında burada görünür.', icon: <CalendarDays /> }}
        />
        <BoardTable
          title={chosen ? formatChallengeDay(chosen) : 'Günün tablosu'}
          description="Her oyuncunun o günkü tek denemesi."
          board={board.data}
          isPending={day === '' ? days.isPending : board.isPending}
          isFetching={board.isFetching}
          error={board.error}
          onPage={setPage}
          empty={{ title: 'Bu gün kimse sıralamaya girmedi', hint: 'Günün akışı oynandıkça burası dolar.' }}
        />
      </div>
      {params.day && !chosen && days.data ? <p className="text-meta text-ink-muted">Bu gün listede yok; tablosu yine de açıldı.</p> : null}
    </Page>
  );
}
