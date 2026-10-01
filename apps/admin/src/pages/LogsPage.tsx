import type { AdminLogEntry, AdminLogLevel, AdminLogRange, AdminLogSource, AdminLogSummary } from '@quezby/types';
import { ChartColumn, CircleAlert, Info, ListOrdered, Logs, SearchCode, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/base/button';
import { Modal } from '@/components/base/modal';
import { Panel } from '@/components/base/panel';
import { Picker } from '@/components/base/picker';
import { Segmented } from '@/components/base/segmented';
import { Skeleton } from '@/components/base/skeleton';
import { Tag } from '@/components/base/tag';
import { BandStats } from '@/components/patterns/band-stats';
import { BarChart } from '@/components/patterns/bar-chart';
import { Callout } from '@/components/patterns/callout';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { EmptyState } from '@/components/patterns/empty-state';
import { Facts } from '@/components/patterns/facts';
import { FilterChips } from '@/components/patterns/filter-chips';
import { Page } from '@/components/patterns/page';
import { Pager } from '@/components/patterns/pager';
import { useLogs, useLogSummary } from '@/hooks/api/logs';
import { useListParams } from '@/hooks/useListParams';
import { When } from '@/lib/columns';
import { errorMessage } from '@/lib/errors';
import { formatDateTime, formatDayKey, formatMonthKey, formatNumber, LOG_LEVEL, LOG_SOURCE, logEventLabel, playerName } from '@/lib/format';

type SourceChip = 'all' | AdminLogSource;
type LevelChoice = 'all' | AdminLogLevel;

function PlayerLink({ player }: { player: AdminLogEntry['player'] }) {
  if (!player) return <span className="text-ink-faint">—</span>;
  if (player.username === null) return <span className="text-ink-faint">Silinmiş oyuncu</span>;
  return (
    <Link to={`/players/${player.id}`} className="font-semibold text-ink hover:text-primary-text hover:underline">
      {playerName(player.username)}
    </Link>
  );
}

/** The request or the call a row is about: `PUT /api/v1/me/push-token`, `422`. */
function where(entry: AdminLogEntry): string | null {
  const request = [entry.method, entry.path].filter(Boolean).join(' ');
  return request === '' ? null : request;
}

const COLUMNS: Column<AdminLogEntry>[] = [
  { key: 'at', header: 'Zaman', cell: (entry) => <When at={entry.at} />, tone: 'muted' },
  {
    key: 'level',
    header: 'Seviye',
    cell: (entry) => <Tag tone={LOG_LEVEL[entry.level].tone} label={LOG_LEVEL[entry.level].label} />,
  },
  {
    key: 'event',
    header: 'Ne oldu',
    cell: (entry) => (
      <span className="block min-w-0">
        <span className="block font-semibold text-ink">{logEventLabel(entry.source, entry.event)}</span>
        <span className="block text-micro font-medium text-ink-faint">
          {LOG_SOURCE[entry.source]}
          {entry.status ? ` · ${entry.status}` : ''}
        </span>
      </span>
    ),
  },
  {
    key: 'message',
    header: 'Mesaj',
    cell: (entry) => <span className="line-clamp-2 max-w-96 break-words">{entry.message}</span>,
    tone: 'muted',
    hideBelow: 'md',
  },
  { key: 'player', header: 'Oyuncu', cell: (entry) => <PlayerLink player={entry.player} />, hideBelow: 'lg' },
  {
    key: 'device',
    header: 'Cihaz',
    cell: (entry) => [entry.platform, entry.appVersion].filter(Boolean).join(' · ') || '—',
    tone: 'muted',
    hideBelow: 'xl',
  },
];

function LogDetail({ entry, onClose, onPlayer }: { entry: AdminLogEntry; onClose: () => void; onPlayer: (id: string) => void }) {
  return (
    <Modal
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={logEventLabel(entry.source, entry.event)}
      description={`${LOG_SOURCE[entry.source]} · ${formatDateTime(entry.at)}`}
      icon={<Logs />}
      tone={LOG_LEVEL[entry.level].tone}
      size="lg"
      footer={
        <>
          {entry.player ? (
            <Button tone="ghost" onClick={() => onPlayer(entry.player?.id ?? '')}>
              Bu oyuncunun logları
            </Button>
          ) : null}
          <Button tone="primary" onClick={onClose}>
            Kapat
          </Button>
        </>
      }
    >
      <p className="mb-4 break-words text-body text-ink">{entry.message}</p>
      <Facts
        facts={[
          { label: 'Seviye', value: <Tag tone={LOG_LEVEL[entry.level].tone} label={LOG_LEVEL[entry.level].label} /> },
          { label: 'Olay', value: <span className="font-mono text-meta">{entry.event}</span> },
          { label: 'Durum kodu', value: entry.status },
          { label: 'İstek', value: where(entry) ? <span className="font-mono text-meta">{where(entry)}</span> : null },
          { label: 'Süre', value: entry.durationMs === null ? null : `${entry.durationMs} ms` },
          { label: 'Oyuncu', value: entry.player ? <PlayerLink player={entry.player} /> : null },
          { label: 'Cihaz', value: [entry.platform, entry.appVersion].filter(Boolean).join(' · ') },
        ]}
      />
      {entry.context ? (
        <div className="mt-5">
          <h3 className="mb-2 text-micro text-ink-faint">Ayrıntı</h3>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-control bg-sunken p-3 font-mono text-meta text-ink">
            {JSON.stringify(entry.context, null, 2)}
          </pre>
        </div>
      ) : null}
    </Modal>
  );
}

/** A level's colour on a chart: an info is no status, so the accent. */
const LEVEL_TONE = { error: 'bad', warning: 'warn', info: 'secondary' } as const;

/**
 * How many rows of each level a day — or a month — held, and the events seen
 * most: the daily counts the API keeps for good, dropped rows counted too.
 * A top event filters the table below.
 */
function LogSummary({
  summary,
  range,
  onRange,
  onEvent,
}: {
  summary: AdminLogSummary;
  range: AdminLogRange;
  onRange: (range: AdminLogRange) => void;
  onEvent: (source: AdminLogSource, event: string) => void;
}) {
  const levels: AdminLogLevel[] = ['error', 'warning', 'info'];
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <Panel
        title={range === '12m' ? 'Son 12 ay' : 'Son 30 gün'}
        description="Her seviyeden kaç kayıt; tablodan silinenler de sayılır, bu sayılar hiç silinmez."
        icon={<ChartColumn />}
        tone="secondary"
        actions={
          <Segmented<AdminLogRange>
            kind="choice"
            aria-label="Dönem"
            value={range}
            onChange={onRange}
            options={[
              { value: '30d', label: '30 gün' },
              { value: '12m', label: '12 ay' },
            ]}
          />
        }
      >
        <BarChart
          label={range === '12m' ? 'Aylık log sayıları' : 'Günlük log sayıları'}
          labels={summary.buckets.map((bucket) => bucket.key)}
          formatLabel={range === '12m' ? formatMonthKey : formatDayKey}
          series={levels.map((level) => ({
            label: LOG_LEVEL[level].label,
            tone: LEVEL_TONE[level],
            values: summary.buckets.map((bucket) => bucket[level]),
          }))}
        />
      </Panel>
      <Panel title="En sık olaylar" description="Dokununca tablo o olaya süzülür." icon={<ListOrdered />} tone="secondary">
        {summary.top.length === 0 ? (
          <EmptyState title="Bu dönemde log yok" icon={<Logs />} />
        ) : (
          <ul aria-label="En sık olaylar" className="space-y-1">
            {summary.top.slice(0, 8).map((row) => (
              <li key={`${row.source}:${row.event}:${row.level}`}>
                <button
                  type="button"
                  onClick={() => onEvent(row.source, row.event)}
                  className="flex w-full items-center justify-between gap-3 rounded-control px-2.5 py-2 text-start hover:bg-fill-hover"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-body font-semibold text-ink">{logEventLabel(row.source, row.event)}</span>
                    <span className="block text-micro font-medium text-ink-faint">
                      {LOG_SOURCE[row.source]} · {LOG_LEVEL[row.level].label}
                    </span>
                  </span>
                  <span className="shrink-0 text-meta font-semibold text-ink tabular">{formatNumber(row.total)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/**
 * What went wrong, and what each push did: failed calls to Firebase, Google
 * and Apple, API errors, push decisions and the errors phones send in. The
 * rows are kept by level (an error 90 days, a warning 14, an info 3); the
 * counts above them for good.
 */
export function LogsPage() {
  const { params, page, set, setPage } = useListParams({ source: 'all', level: 'all', event: 'all', player: '', range: '30d' });
  const range: AdminLogRange = params.range === '12m' ? '12m' : '30d';
  const summary = useLogSummary(range);
  const source = params.source as SourceChip;
  const level = params.level as LevelChoice;
  const [open, setOpen] = useState<AdminLogEntry | null>(null);

  const logs = useLogs({
    source: source === 'all' ? undefined : source,
    level: level === 'all' ? undefined : level,
    event: params.event === 'all' ? undefined : params.event,
    player: params.player || undefined,
    page,
  });
  const events = logs.data?.events ?? [];
  const filtered = source !== 'all' || level !== 'all' || params.event !== 'all' || params.player !== '';

  return (
    <Page
      title="Loglar"
      description="Firebase, Google ve Apple’a giden başarısız istekler, API hataları, her push’un ne olduğu ve telefonların gönderdiği hatalar. Hatalar 90, uyarılar 14, bilgiler 3 gün durur; sayıları hiç silinmez."
      band={
        summary.data ? (
          <BandStats
            stats={[
              { label: 'Hata', value: formatNumber(summary.data.totals.error), icon: <CircleAlert />, alert: summary.data.totals.error > 0 },
              { label: 'Uyarı', value: formatNumber(summary.data.totals.warning), icon: <TriangleAlert /> },
              { label: 'Bilgi', value: formatNumber(summary.data.totals.info), icon: <Info /> },
            ]}
          />
        ) : undefined
      }
    >
      {summary.isPending ? (
        <Skeleton className="h-72 rounded-panel" />
      ) : summary.error || !summary.data ? (
        <Callout tone="bad" title="Özet alınamadı">
          {errorMessage(summary.error)}
        </Callout>
      ) : (
        <LogSummary
          summary={summary.data}
          range={range}
          onRange={(value) => set({ range: value })}
          onEvent={(eventSource, event) => set({ source: eventSource, event, level: 'all' })}
        />
      )}
      <DataTable
        title={params.player ? 'Tek bir oyuncunun logları' : 'Bütün loglar'}
        description="Yeniden eskiye"
        icon={<Logs />}
        columns={COLUMNS}
        rows={logs.data?.items ?? []}
        rowKey={(entry) => String(entry.id)}
        rowActions={(entry) => (
          <Button size="sm" tone="ghost" icon={<SearchCode />} onClick={() => setOpen(entry)}>
            Ayrıntı
          </Button>
        )}
        isLoading={logs.isPending}
        isFetching={logs.isFetching}
        error={logs.error}
        actions={
          params.player ? (
            <Button size="sm" tone="ghost" onClick={() => set({ player: '' })}>
              Oyuncu filtresini kaldır
            </Button>
          ) : null
        }
        toolbar={
          <>
            <FilterChips<SourceChip>
              aria-label="Kaynak"
              value={source}
              onChange={(value) => set({ source: value, event: 'all' })}
              chips={[
                { value: 'all', label: 'Tümü' },
                ...(Object.entries(LOG_SOURCE) as [AdminLogSource, string][]).map(([value, label]) => ({ value, label })),
              ]}
            />
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <Picker<LevelChoice>
                compact
                aria-label="Seviye"
                value={level}
                onChange={(value) => set({ level: value })}
                options={[
                  { value: 'all', label: 'Bütün seviyeler' },
                  ...(Object.entries(LOG_LEVEL) as [AdminLogLevel, { label: string }][]).map(([value, { label }]) => ({ value, label })),
                ]}
              />
              <Picker<string>
                compact
                aria-label="Olay"
                value={params.event}
                onChange={(value) => set({ event: value })}
                options={[
                  { value: 'all', label: 'Bütün olaylar' },
                  ...events.map((event) => ({ value: event, label: source === 'all' ? event : logEventLabel(source, event) })),
                ]}
              />
            </div>
          </>
        }
        empty={
          filtered
            ? { title: 'Bu filtrede log yok', hint: 'Filtreleri kaldırıp bütün loglara dön.', icon: <Logs /> }
            : { title: 'Henüz log yok', hint: 'İlk API hatası, dış servis hatası ya da push burada görünür.', icon: <Logs /> }
        }
        footer={
          logs.data ? (
            <Pager page={logs.data.page} perPage={logs.data.perPage} count={logs.data.items.length} hasMore={logs.data.hasMore} onPage={setPage} noun="log" />
          ) : undefined
        }
      />
      {open ? (
        <LogDetail
          entry={open}
          onClose={() => setOpen(null)}
          onPlayer={(id) => {
            setOpen(null);
            set({ player: id });
          }}
        />
      ) : null}
    </Page>
  );
}
