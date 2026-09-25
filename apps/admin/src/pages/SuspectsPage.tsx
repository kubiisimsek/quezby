import type { AdminPlayerRef, AdminRunRow, AdminSuspect, AdminSuspectWindow, RunFlagCode } from '@quezby/types';
import { Ban, CircleCheck, CircleX, Gamepad2, Hourglass, ShieldAlert, Smartphone, Users } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/base/button';
import { Checkbox } from '@/components/base/checkbox';
import { Picker } from '@/components/base/picker';
import { Segmented } from '@/components/base/segmented';
import { Tag } from '@/components/base/tag';
import { Hint } from '@/components/base/tooltip';
import { BanPlayerDialog } from '@/components/moderation/player-dialogs';
import { ApproveRunDialog, RejectRunDialog } from '@/components/moderation/run-dialogs';
import { BandStats } from '@/components/patterns/band-stats';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { Page } from '@/components/patterns/page';
import { Pager } from '@/components/patterns/pager';
import { useCounts } from '@/hooks/api/counts';
import { useRuns } from '@/hooks/api/runs';
import { useSuspects } from '@/hooks/api/suspects';
import { useListParams } from '@/hooks/useListParams';
import { FLAG_OPTIONS, PlayerCell, RUN_COLUMNS } from '@/lib/columns';
import { formatNumber, formatRelative, RUN_FLAG, SEVERITY, shortId } from '@/lib/format';
import { can } from '@/lib/permissions';
import { useSession } from '@/stores/session';

type Tab = 'queue' | 'flagged' | 'players';
type FlagChoice = 'all' | RunFlagCode;

/** A player's risk in words: how worried the numbers are. */
function riskTone(risk: number): 'bad' | 'warn' | 'neutral' {
  if (risk >= 20) return 'bad';
  if (risk >= 8) return 'warn';
  return 'neutral';
}

const SUSPECT_COLUMNS: Column<AdminSuspect>[] = [
  { key: 'player', header: 'Oyuncu', cell: (suspect) => <PlayerCell player={suspect.player} hint={suspect.lastFlagAt ? `Son sinyal ${formatRelative(suspect.lastFlagAt)}` : undefined} /> },
  {
    key: 'risk',
    header: 'Risk',
    cell: (suspect) => <Tag tone={riskTone(suspect.risk)} label={formatNumber(suspect.risk)} />,
  },
  {
    key: 'runs',
    header: 'Sorunlu tur',
    cell: (suspect) => (
      <span className="whitespace-nowrap text-meta">
        <b className="text-ink">{formatNumber(suspect.runs.flagged)}</b> bayraklı · <b className="text-ink">{formatNumber(suspect.runs.review)}</b> incelemede
        {suspect.runs.rejected > 0 ? ` · ${formatNumber(suspect.runs.rejected)} reddedildi` : ''}
      </span>
    ),
    tone: 'muted',
    hideBelow: 'xl',
  },
  {
    key: 'codes',
    header: 'Sinyaller',
    cell: (suspect) =>
      suspect.codes.length === 0 ? (
        <span className="text-ink-faint">—</span>
      ) : (
        <span className="flex flex-wrap gap-1">
          {suspect.codes.slice(0, 3).map((code) => (
            <Hint key={code.code} content={RUN_FLAG[code.code]?.hint ?? code.code}>
              <span>
                <Tag tone={SEVERITY[code.severity].tone} label={`${RUN_FLAG[code.code]?.label ?? code.code} ×${code.count}`} />
              </span>
            </Hint>
          ))}
          {suspect.codes.length > 3 ? <Tag tone="neutral" dot={false} label={`+${suspect.codes.length - 3}`} /> : null}
        </span>
      ),
    hideBelow: 'md',
  },
  {
    key: 'device',
    header: 'Cihaz',
    cell: (suspect) => (
      <span className="flex flex-wrap gap-1">
        {suspect.deviceFails > 0 ? <Tag tone="bad" icon={<Smartphone />} label={`${formatNumber(suspect.deviceFails)} başarısız`} /> : null}
        {suspect.sharedInstall > 0 ? <Tag tone="warn" icon={<Users />} label={`${formatNumber(suspect.sharedInstall)} hesap daha`} /> : null}
        {suspect.deviceFails === 0 && suspect.sharedInstall === 0 ? <span className="text-ink-faint">—</span> : null}
      </span>
    ),
    hideBelow: 'xl',
  },
  { key: 'top', header: 'En iyi skor', cell: (suspect) => formatNumber(suspect.topScore), align: 'end', tone: 'strong' },
];

/**
 * Where the anti-cheat asks for a person: the runs held for review, the runs
 * it flagged, and the players whose signals add up to the most worry.
 */
export function SuspectsPage() {
  const role = useSession((state) => state.session?.admin.role);
  const moderator = can(role, 'moderate');
  const { params, page, set, setPage } = useListParams({ tab: 'queue', flag: 'all', days: '30', banned: '' });
  const tab = params.tab as Tab;
  const flag = params.flag as FlagChoice;
  const days = (params.days === '7' ? 7 : 30) as AdminSuspectWindow;

  const counts = useCounts();
  const queue = useRuns({ status: 'review', sort: 'score', page }, { enabled: tab === 'queue' });
  const flagged = useRuns({ status: 'flagged', flag: flag === 'all' ? undefined : flag, page }, { enabled: tab === 'flagged' });
  const suspects = useSuspects({ days, includeBanned: params.banned === '1', page }, { enabled: tab === 'players' });

  const [approving, setApproving] = useState<AdminRunRow | null>(null);
  const [rejecting, setRejecting] = useState<AdminRunRow | null>(null);
  const [banning, setBanning] = useState<AdminPlayerRef | null>(null);

  const runActions = (run: AdminRunRow) =>
    moderator ? (
      <>
        {run.status === 'review' ? (
          <Button size="sm" tone="secondary" icon={<CircleCheck />} labelFrom="xl" onClick={() => setApproving(run)}>
            Onayla
          </Button>
        ) : null}
        <Button size="sm" tone="ghost" icon={<CircleX />} labelFrom="xl" onClick={() => setRejecting(run)}>
          Reddet
        </Button>
      </>
    ) : null;

  return (
    <Page
      title="Şüpheliler"
      description="Hile korumasının bir insana sorduğu her şey: incelemede bekleyen zirve skorlar, bayraklanan turlar ve sinyalleri en çok biriken oyuncular."
      band={
        <BandStats
          stats={[
            { label: 'İncelemede', value: counts.data ? formatNumber(counts.data.review) : '…', icon: <Hourglass />, alert: (counts.data?.review ?? 0) > 0 },
            ...(tab === 'flagged' && flagged.data ? [{ label: 'Bayraklı tur', value: formatNumber(flagged.data.total), icon: <ShieldAlert /> }] : []),
            ...(tab === 'players' && suspects.data ? [{ label: `Şüpheli · ${days} gün`, value: formatNumber(suspects.data.total), icon: <Users /> }] : []),
          ]}
        />
      }
      tabs={
        <Segmented<Tab>
          aria-label="Şüpheliler"
          value={tab}
          onChange={(value) => set({ tab: value })}
          options={[
            { value: 'queue', label: 'İnceleme kuyruğu', icon: <Hourglass />, count: counts.data?.review },
            { value: 'flagged', label: 'Bayraklı turlar', icon: <ShieldAlert /> },
            { value: 'players', label: 'Şüpheli oyuncular', icon: <Users /> },
          ]}
        />
      }
    >
      {tab === 'queue' ? (
        <DataTable
          title="İnceleme kuyruğu"
          description="Yumuşak sinyali olan ve zirveye girecek skorlar, en yüksek önce. Onaylanana kadar hiçbir tabloda görünmezler."
          icon={<Hourglass />}
          tone="warn"
          columns={RUN_COLUMNS}
          rows={queue.data?.items ?? []}
          rowKey={(run) => run.id}
          rowTo={(run) => `/runs/${run.id}`}
          rowLabel={(run) => `Tur ${shortId(run.id)} aç`}
          rowActions={runActions}
          isLoading={queue.isPending}
          isFetching={queue.isFetching}
          error={queue.error}
          empty={{ title: 'Kuyruk boş', hint: 'İncelemede bekleyen tur yok. Yeni bir zirve skor sinyal taşırsa burada görünür.', icon: <CircleCheck /> }}
          footer={queue.data ? <Pager page={queue.data.page} perPage={queue.data.perPage} total={queue.data.total} onPage={setPage} noun="tur" /> : undefined}
        />
      ) : null}

      {tab === 'flagged' ? (
        <DataTable
          title="Bayraklı turlar"
          description="Sert bir sinyal taşıyan turlar: saklanır, hiçbir tabloya girmez."
          icon={<ShieldAlert />}
          tone="bad"
          columns={RUN_COLUMNS}
          rows={flagged.data?.items ?? []}
          rowKey={(run) => run.id}
          rowTo={(run) => `/runs/${run.id}`}
          rowLabel={(run) => `Tur ${shortId(run.id)} aç`}
          rowActions={runActions}
          isLoading={flagged.isPending}
          isFetching={flagged.isFetching}
          error={flagged.error}
          toolbar={
            <Picker<FlagChoice>
              compact
              aria-label="Sinyal"
              value={flag}
              onChange={(value) => set({ flag: value })}
              options={[{ value: 'all', label: 'Bütün sinyaller', icon: <ShieldAlert /> }, ...FLAG_OPTIONS]}
            />
          }
          empty={
            flag === 'all'
              ? { title: 'Bayraklı tur yok', hint: 'Hile koruması henüz hiçbir turu durdurmadı.', icon: <ShieldAlert /> }
              : { title: 'Bu sinyalle tur yok', hint: 'Başka bir sinyal seç ya da Bütün sinyaller’e dön.', icon: <ShieldAlert /> }
          }
          footer={flagged.data ? <Pager page={flagged.data.page} perPage={flagged.data.perPage} total={flagged.data.total} onPage={setPage} noun="tur" /> : undefined}
        />
      ) : null}

      {tab === 'players' ? (
        <DataTable
          title="Şüpheli oyuncular"
          description="Turlarındaki sinyaller ne kadar kesinse o kadar ağır sayılır; başarısız cihaz kontrolleri ve aynı cihazdaki hesaplar da eklenir."
          icon={<Users />}
          columns={SUSPECT_COLUMNS}
          rows={suspects.data?.items ?? []}
          rowKey={(suspect) => suspect.player.id}
          rowTo={(suspect) => `/players/${suspect.player.id}`}
          rowLabel={(suspect) => `${suspect.player.username ?? 'Adsız oyuncu'} sayfasını aç`}
          rowMuted={(suspect) => suspect.player.bannedAt !== null}
          rowActions={(suspect) =>
            moderator && suspect.player.bannedAt === null ? (
              <Button size="sm" tone="ghost" icon={<Ban />} labelFrom="xl" onClick={() => setBanning(suspect.player)}>
                Yasakla
              </Button>
            ) : null
          }
          isLoading={suspects.isPending}
          isFetching={suspects.isFetching}
          error={suspects.error}
          toolbar={
            <>
              <Segmented<'7' | '30'>
                kind="choice"
                aria-label="Dönem"
                value={String(days) as '7' | '30'}
                onChange={(value) => set({ days: value })}
                options={[
                  { value: '7', label: 'Son 7 gün' },
                  { value: '30', label: 'Son 30 gün' },
                ]}
              />
              <Checkbox label="Yasaklıları da göster" checked={params.banned === '1'} onChange={(event) => set({ banned: event.target.checked ? '1' : '' })} />
            </>
          }
          empty={{ title: 'Şüpheli oyuncu yok', hint: `Son ${days} günde sinyalleri eşiği geçen oyuncu çıkmadı.`, icon: <Gamepad2 /> }}
          footer={suspects.data ? <Pager page={suspects.data.page} perPage={suspects.data.perPage} total={suspects.data.total} onPage={setPage} noun="oyuncu" /> : undefined}
        />
      ) : null}

      {approving ? <ApproveRunDialog run={approving} open onOpenChange={(open) => !open && setApproving(null)} /> : null}
      {rejecting ? <RejectRunDialog run={rejecting} open onOpenChange={(open) => !open && setRejecting(null)} /> : null}
      {banning ? <BanPlayerDialog player={banning} open onOpenChange={(open) => !open && setBanning(null)} /> : null}
    </Page>
  );
}
