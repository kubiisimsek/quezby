import type { LeaderboardPeriod } from '@quezby/types';
import { CalendarRange, Crown, Infinity as AllTime, Trophy, Users } from 'lucide-react';

import { Picker } from '@/components/base/picker';
import { Segmented } from '@/components/base/segmented';
import { BoardTable } from '@/components/boards/board-table';
import { BandStats } from '@/components/patterns/band-stats';
import { Page } from '@/components/patterns/page';
import { useBoard, useBoardKeys } from '@/hooks/api/boards';
import { useListParams } from '@/hooks/useListParams';
import { BOARD, formatNumber, formatPeriodKey } from '@/lib/format';

const BOARDS: { value: LeaderboardPeriod; icon: React.ReactNode }[] = [
  { value: 'weekly', icon: <CalendarRange /> },
  { value: 'monthly', icon: <CalendarRange /> },
  { value: 'all', icon: <AllTime /> },
];

/**
 * The high-score boards — this week, this month, all time — for any past
 * period and season. Every number comes from the API, ranked as the game
 * ranks it. There is no day board: no board serves a day.
 */
export function BoardsPage() {
  const { params, page, set, setPage } = useListParams({ board: 'weekly', key: '', season: '' });
  const board = (['weekly', 'monthly', 'all'].includes(params.board) ? params.board : 'weekly') as LeaderboardPeriod;
  const season = params.season ? Number(params.season) : undefined;

  const keys = useBoardKeys({ board, season, limit: 60 });
  const rows = useBoard({ board, key: params.key || undefined, season, page });
  const data = rows.data;
  const leader = data && data.page === 1 ? data.items[0] : undefined;

  return (
    <Page
      title="Sıralamalar"
      description="Yüksek skorlar: haftalık, aylık ve tüm zamanlar. Bir satır, arkasındaki turu açar."
      band={
        <BandStats
          stats={[
            { label: data ? formatPeriodKey(data.board, data.key) : 'Dönem', value: data ? formatNumber(data.total) : '…', icon: <Users /> },
            { label: 'Lider skor', value: leader ? formatNumber(leader.score) : '—', icon: <Crown /> },
            { label: 'Sezon', value: data ? formatNumber(data.season) : '…', icon: <Trophy /> },
          ]}
        />
      }
      tabs={
        <Segmented<LeaderboardPeriod>
          aria-label="Tablo"
          value={board}
          onChange={(value) => set({ board: value, key: '' })}
          options={BOARDS.map((one) => ({ value: one.value, label: BOARD[one.value], icon: one.icon }))}
        />
      }
    >
      <BoardTable
        title={data && board !== 'all' ? `${BOARD[board]} · ${formatPeriodKey(data.board, data.key)}` : BOARD[board]}
        description="Oyunun sıraladığı gibi: skor, eşitlikte önce ulaşan."
        board={data}
        isPending={rows.isPending}
        isFetching={rows.isFetching}
        error={rows.error}
        onPage={setPage}
        empty={{ title: 'Bu dönemde kimse yok', hint: 'Bu tabloya henüz sıralamaya giren bir tur düşmedi.' }}
        toolbar={
          <>
            {board !== 'all' ? (
              <Picker<string>
                compact
                aria-label="Dönem"
                value={params.key || data?.key}
                onChange={(value) => set({ key: value })}
                placeholder="Dönem seç"
                options={(keys.data?.keys ?? []).map((key) => ({
                  value: key.key,
                  label: formatPeriodKey(board, key.key),
                  hint: `${formatNumber(key.players)} oyuncu`,
                }))}
              />
            ) : null}
            {data && data.seasons.length > 1 ? (
              <Picker<string>
                compact
                aria-label="Sezon"
                value={String(data.season)}
                onChange={(value) => set({ season: value, key: '' })}
                options={data.seasons.map((one) => ({ value: String(one), label: `Sezon ${one}` }))}
              />
            ) : null}
          </>
        }
      />
    </Page>
  );
}
