import type { AdminRunSort, AdminRunStatus, RunFlagCode, RunMode } from '@quezby/types';
import { CalendarDays, Gamepad2, ShieldAlert, X } from 'lucide-react';

import { Button } from '@/components/base/button';
import { Picker } from '@/components/base/picker';
import { TextInput } from '@/components/base/text-input';
import { DataTable } from '@/components/patterns/data-table';
import { FilterChips } from '@/components/patterns/filter-chips';
import { Page } from '@/components/patterns/page';
import { Pager } from '@/components/patterns/pager';
import { useRuns } from '@/hooks/api/runs';
import { useListParams } from '@/hooks/useListParams';
import { FLAG_OPTIONS, RUN_COLUMNS } from '@/lib/columns';
import { RUN_MODE, RUN_STATUS, shortId } from '@/lib/format';

type StatusChip = 'all' | AdminRunStatus;
type ModeChoice = 'all' | RunMode;
type FlagChoice = 'all' | RunFlagCode;

const STATUSES = Object.keys(RUN_STATUS) as AdminRunStatus[];
const MODES = Object.keys(RUN_MODE) as RunMode[];

/** Every run the game ever started, in every state, by the filters the address carries. */
export function RunsPage() {
  const { params, page, set, setPage } = useListParams({
    status: 'all',
    mode: 'all',
    flag: 'all',
    player: '',
    from: '',
    to: '',
    sort: 'newest',
  });
  const status = params.status as StatusChip;
  const mode = params.mode as ModeChoice;
  const flag = params.flag as FlagChoice;

  const runs = useRuns({
    status: status === 'all' ? undefined : status,
    mode: mode === 'all' ? undefined : mode,
    flag: flag === 'all' ? undefined : flag,
    player: params.player || undefined,
    from: params.from || undefined,
    to: params.to || undefined,
    sort: params.sort as AdminRunSort,
    page,
  });
  const counts = runs.data?.counts ?? {};
  const all = Object.values(counts).reduce((sum, count) => sum + (count ?? 0), 0);
  const playerName = params.player ? runs.data?.items[0]?.player.username : undefined;
  const filtered = status !== 'all' || mode !== 'all' || flag !== 'all' || params.player || params.from || params.to;

  return (
    <Page title="Turlar" description="Başlatılan her tur: sıralamaya girenler, bayraklananlar, incelemede bekleyenler, VS’ler, yarım kalanlar.">
      <DataTable
        title={params.player ? `${playerName ? `@${playerName}` : 'Bir oyuncunun'} turları` : 'Bütün turlar'}
        description={params.sort === 'score' ? 'En yüksek skor önce' : 'Yeniden eskiye'}
        icon={<Gamepad2 />}
        columns={RUN_COLUMNS}
        rows={runs.data?.items ?? []}
        rowKey={(run) => run.id}
        rowTo={(run) => `/runs/${run.id}`}
        rowLabel={(run) => `Tur ${shortId(run.id)} aç`}
        isLoading={runs.isPending}
        isFetching={runs.isFetching}
        error={runs.error}
        actions={
          params.player ? (
            <Button size="sm" tone="ghost" icon={<X />} onClick={() => set({ player: '' })}>
              Oyuncu filtresini kaldır
            </Button>
          ) : null
        }
        toolbar={
          <>
            <FilterChips<StatusChip>
              aria-label="Durum"
              value={status}
              onChange={(value) => set({ status: value })}
              chips={[
                { value: 'all', label: 'Tümü', count: runs.data ? all : undefined },
                ...STATUSES.map((value) => ({ value, label: RUN_STATUS[value].label, count: runs.data ? (counts[value] ?? 0) : undefined })),
              ]}
            />
            <div className="flex w-full flex-wrap items-center gap-2">
              <Picker<ModeChoice>
                compact
                aria-label="Mod"
                value={mode}
                onChange={(value) => set({ mode: value })}
                options={[{ value: 'all', label: 'Bütün modlar' }, ...MODES.map((value) => ({ value, label: RUN_MODE[value] }))]}
              />
              <Picker<FlagChoice>
                compact
                aria-label="Sinyal"
                value={flag}
                onChange={(value) => set({ flag: value })}
                options={[{ value: 'all', label: 'Bütün sinyaller', icon: <ShieldAlert /> }, ...FLAG_OPTIONS]}
              />
              <TextInput
                compact
                type="date"
                icon={<CalendarDays />}
                aria-label="Başlangıç günü"
                value={params.from}
                onChange={(event) => set({ from: event.target.value })}
                wellClassName="w-auto"
              />
              <TextInput
                compact
                type="date"
                icon={<CalendarDays />}
                aria-label="Bitiş günü"
                value={params.to}
                onChange={(event) => set({ to: event.target.value })}
                wellClassName="w-auto"
              />
              <div className="sm:ml-auto">
                <Picker<AdminRunSort>
                  compact
                  aria-label="Sıralama"
                  value={params.sort as AdminRunSort}
                  onChange={(value) => set({ sort: value })}
                  options={[
                    { value: 'newest', label: 'En yeni' },
                    { value: 'score', label: 'En yüksek skor' },
                  ]}
                />
              </div>
            </div>
          </>
        }
        empty={
          filtered
            ? { title: 'Bu filtrede tur yok', hint: 'Filtreleri gevşet ya da Tümü’ne dön.', icon: <Gamepad2 /> }
            : { title: 'Henüz tur yok', hint: 'İlk sıralı tur başladığında burada görünür.', icon: <Gamepad2 /> }
        }
        footer={runs.data ? <Pager page={runs.data.page} perPage={runs.data.perPage} total={runs.data.total} onPage={setPage} noun="tur" /> : undefined}
      />
    </Page>
  );
}
