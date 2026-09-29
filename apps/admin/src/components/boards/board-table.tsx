import type { AdminBoardResponse, AdminBoardRow, AdminPlayerRef } from '@quezby/types';
import { Ban, CircleX, Crown, MoreHorizontal, Trophy, UserRound } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/base/button';
import { Menu, type MenuItem } from '@/components/base/menu';
import { BanPlayerDialog } from '@/components/moderation/player-dialogs';
import { RejectRunDialog } from '@/components/moderation/run-dialogs';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { Pager } from '@/components/patterns/pager';
import { FlagTags, PlayerCell, RunStatusTag } from '@/lib/columns';
import { formatDateTime, formatNumber, formatRelative } from '@/lib/format';
import { can } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { useSession } from '@/stores/session';

/** The rank as the game shows it: the podium wears a crown. */
export function Rank({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 min-w-9 items-center justify-center gap-1 rounded-pill px-2 text-meta font-bold tabular',
        rank === 1 ? 'bg-primary text-primary-ink' : rank <= 3 ? 'bg-primary-soft text-primary-text' : 'bg-fill text-ink-muted',
      )}
    >
      {rank <= 3 ? <Crown aria-hidden className="size-3.5" /> : null}#{formatNumber(rank)}
    </span>
  );
}

const COLUMNS: Column<AdminBoardRow>[] = [
  { key: 'rank', header: 'Sıra', cell: (row) => <Rank rank={row.rank} />, width: '6rem' },
  {
    key: 'player',
    header: 'Oyuncu',
    cell: (row) => (
      <span title={formatDateTime(row.achievedAt)}>
        <PlayerCell player={row.player} link hint={formatRelative(row.achievedAt)} />
      </span>
    ),
  },
  { key: 'score', header: 'Skor', cell: (row) => formatNumber(row.score), align: 'end', tone: 'strong' },
  { key: 'reels', header: 'Post', cell: (row) => formatNumber(row.reels), align: 'end', tone: 'muted', hideBelow: 'xl' },
  {
    key: 'run',
    header: 'Tur',
    cell: (row) =>
      row.run ? (
        <span className="flex flex-wrap items-center gap-1">
          {row.run.status !== 'ranked' ? <RunStatusTag status={row.run.status} /> : null}
          <FlagTags flags={row.run.flags} max={2} />
        </span>
      ) : (
        <span className="text-ink-faint">Silindi</span>
      ),
    hideBelow: 'lg',
  },
];

/**
 * A page of a high-score board, ranked as the game ranks it, with the run
 * behind each row. A moderator can throw a run out or ban its player from
 * the row — the board is rebuilt either way.
 */
export function BoardTable({
  board,
  isPending,
  isFetching,
  error,
  onPage,
  title,
  description,
  toolbar,
  empty,
}: {
  board: AdminBoardResponse | undefined;
  isPending: boolean;
  isFetching: boolean;
  error: unknown;
  onPage: (page: number) => void;
  title: ReactNode;
  description?: ReactNode;
  toolbar?: ReactNode;
  empty: { title: string; hint?: string };
}) {
  const role = useSession((state) => state.session?.admin.role);
  const navigate = useNavigate();
  const [rejecting, setRejecting] = useState<AdminBoardRow | null>(null);
  const [banning, setBanning] = useState<AdminPlayerRef | null>(null);

  const actions = (row: AdminBoardRow) => {
    const items: MenuItem[] = [{ label: 'Oyuncuya git', icon: <UserRound />, onSelect: () => navigate(`/players/${row.player?.id}`) }];
    if (can(role, 'moderate')) {
      if (row.run) items.push({ label: 'Turu reddet', hint: 'Tablo yeniden kurulur', icon: <CircleX />, onSelect: () => setRejecting(row), tone: 'danger' });
      if (row.player && row.player.bannedAt === null) {
        const player = row.player;
        items.push({ label: 'Oyuncuyu yasakla', hint: 'Bütün tablolardan çıkar', icon: <Ban />, onSelect: () => setBanning(player), tone: 'danger' });
      }
    }
    return <Menu label="Satır işlemleri" items={items} trigger={<Button tone="ghost" size="icon-sm" aria-label="Satır işlemleri" icon={<MoreHorizontal />} />} />;
  };

  return (
    <>
      <DataTable
        title={title}
        description={description}
        icon={<Trophy />}
        columns={COLUMNS}
        rows={board?.items ?? []}
        rowKey={(row) => `${row.player?.id ?? 'deleted'}-${row.rank}-${row.achievedAt}`}
        rowTo={(row) => (row.run ? `/runs/${row.run.id}` : `/players/${row.player?.id}`)}
        rowLabel={(row) => `#${row.rank} turunu aç`}
        rowActions={actions}
        isLoading={isPending}
        isFetching={isFetching}
        error={error}
        toolbar={toolbar}
        empty={{ ...empty, icon: <Trophy /> }}
        footer={board ? <Pager page={board.page} perPage={board.perPage} total={board.total} onPage={onPage} noun="oyuncu" /> : undefined}
      />
      {rejecting?.run ? (
        <RejectRunDialog
          run={{ id: rejecting.run.id, player: rejecting.player ?? { id: '', username: null, bannedAt: null }, score: rejecting.score }}
          open
          onOpenChange={(open) => !open && setRejecting(null)}
        />
      ) : null}
      {banning ? <BanPlayerDialog player={banning} open onOpenChange={(open) => !open && setBanning(null)} /> : null}
    </>
  );
}
