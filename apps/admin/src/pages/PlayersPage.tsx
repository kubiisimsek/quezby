import type { AdminPlayerRow, AdminPlayerSort, AdminPlayerStatus, Platform } from '@quezby/types';
import { Ban, Search, Smartphone, UserRound, Users, UserX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Picker } from '@/components/base/picker';
import { Tag } from '@/components/base/tag';
import { TextInput } from '@/components/base/text-input';
import { BandStats } from '@/components/patterns/band-stats';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { FilterChips } from '@/components/patterns/filter-chips';
import { Page } from '@/components/patterns/page';
import { Pager } from '@/components/patterns/pager';
import { usePlayers } from '@/hooks/api/players';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useListParams } from '@/hooks/useListParams';
import { PlayerCell, When } from '@/lib/columns';
import { formatNumber, PLATFORM, PROVIDER } from '@/lib/format';

type StatusChip = 'all' | AdminPlayerStatus;
type PlatformChoice = 'all' | Platform;

const SORTS: { value: AdminPlayerSort; label: string }[] = [
  { value: 'newest', label: 'En yeni' },
  { value: 'oldest', label: 'En eski' },
  { value: 'best', label: 'En iyi skor' },
  { value: 'lastPlayed', label: 'Son oynayan' },
];

/** An email is found by, never written into, the address bar. */
function looksLikeEmail(text: string): boolean {
  return text.includes('@') && !text.startsWith('@');
}

/** How the player signs in: what is attached, or that they are a guest. */
function signIn(player: AdminPlayerRow): string {
  const ways = [...(player.email ? ['E-posta'] : []), ...player.identities.map((provider) => PROVIDER[provider])];
  return ways.length > 0 ? ways.join(' · ') : 'Misafir';
}

const COLUMNS: Column<AdminPlayerRow>[] = [
  {
    key: 'player',
    header: 'Oyuncu',
    cell: (player) => (
      <span className="flex flex-wrap items-center gap-1.5">
        <PlayerCell player={player} hint={player.email ?? undefined} />
        {player.isAutoUsername ? <Tag tone="neutral" dot={false} label="Otomatik ad" /> : null}
      </span>
    ),
  },
  {
    key: 'sign-in',
    header: 'Giriş',
    cell: (player) => (player.isGuest ? <Tag tone="warn" label="Misafir" /> : <span>{signIn(player)}</span>),
    tone: 'muted',
    hideBelow: 'md',
  },
  { key: 'platform', header: 'Platform', cell: (player) => (player.platform ? PLATFORM[player.platform] : '—'), tone: 'muted', hideBelow: 'lg' },
  { key: 'best', header: 'Sezon rekoru', cell: (player) => formatNumber(player.best), align: 'end', tone: 'strong' },
  { key: 'last', header: 'Son oyun', cell: (player) => <When at={player.lastPlayedAt} />, tone: 'muted', hideBelow: 'md' },
  { key: 'joined', header: 'Katıldı', cell: (player) => <When at={player.createdAt} as="date" />, tone: 'muted', hideBelow: 'xl' },
];

/** Every account — guests, linked players and the banned — found by name, email, id or install. */
export function PlayersPage() {
  const { params, page, set, setPage } = useListParams({ search: '', status: 'all', platform: 'all', sort: 'newest' });
  const [typed, setTyped] = useState(params.search);
  const search = useDebouncedValue(typed.trim(), 300);
  const lastSearch = useRef(search);

  // A new search starts at page one; an email stays out of the address bar.
  useEffect(() => {
    if (search === lastSearch.current) return;
    lastSearch.current = search;
    set({ search: looksLikeEmail(search) ? '' : search });
  }, [search, set]);

  const status = params.status as StatusChip;
  const platform = params.platform as PlatformChoice;
  const players = usePlayers({
    search: search || undefined,
    status: status === 'all' ? undefined : status,
    platform: platform === 'all' ? undefined : platform,
    sort: params.sort as AdminPlayerSort,
    page,
  });
  const counts = players.data?.counts;

  return (
    <Page
      title="Oyuncular"
      description="Her hesap burada: misafirler, bağlı hesaplar ve yasaklılar. Bir satır oyuncunun sayfasını açar."
      band={
        <BandStats
          stats={[
            { label: 'Oyuncu', value: counts ? formatNumber(counts.all) : '…', icon: <Users /> },
            { label: 'Aktif', value: counts ? formatNumber(counts.active) : '…', icon: <UserRound /> },
            { label: 'Misafir', value: counts ? formatNumber(counts.guest) : '…', icon: <UserX /> },
            { label: 'Yasaklı', value: counts ? formatNumber(counts.banned) : '…', icon: <Ban /> },
          ]}
        />
      }
    >
      <DataTable
        title="Hesaplar"
        description={search ? `“${search}” için sonuçlar` : 'Yeniden eskiye'}
        icon={<Users />}
        columns={COLUMNS}
        rows={players.data?.items ?? []}
        rowKey={(player) => player.id}
        rowTo={(player) => `/players/${player.id}`}
        rowLabel={(player) => `${player.username ?? 'Adsız oyuncu'} sayfasını aç`}
        rowMuted={(player) => player.bannedAt !== null}
        isLoading={players.isPending}
        isFetching={players.isFetching}
        error={players.error}
        toolbar={
          <>
            <TextInput
              compact
              icon={<Search />}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder="Ad, e-posta, oyuncu ya da kurulum kimliği"
              aria-label="Oyuncu ara"
              wellClassName="sm:max-w-80"
              type="search"
            />
            <FilterChips<StatusChip>
              aria-label="Durum"
              value={status}
              onChange={(value) => set({ status: value })}
              chips={[
                { value: 'all', label: 'Tümü', count: counts?.all },
                { value: 'active', label: 'Aktif', count: counts?.active },
                { value: 'guest', label: 'Misafir', count: counts?.guest },
                { value: 'banned', label: 'Yasaklı', count: counts?.banned },
              ]}
            />
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <Picker<PlatformChoice>
                compact
                aria-label="Platform"
                value={platform}
                onChange={(value) => set({ platform: value })}
                options={[
                  { value: 'all', label: 'Tüm platformlar', icon: <Smartphone /> },
                  { value: 'ios', label: 'iOS' },
                  { value: 'android', label: 'Android' },
                ]}
              />
              <Picker<AdminPlayerSort> compact aria-label="Sıralama" value={params.sort as AdminPlayerSort} onChange={(value) => set({ sort: value })} options={SORTS} />
            </div>
          </>
        }
        empty={
          search || status !== 'all' || platform !== 'all'
            ? { title: 'Bu aramada oyuncu yok', hint: 'Aramayı temizle ya da Tümü’ne dön.', icon: <Search /> }
            : { title: 'Henüz oyuncu yok', hint: 'İlk oyuncu uygulamayı açtığında burada görünür.', icon: <Users /> }
        }
        footer={players.data ? <Pager page={players.data.page} perPage={players.data.perPage} total={players.data.total} onPage={setPage} noun="oyuncu" /> : undefined}
      />
    </Page>
  );
}
