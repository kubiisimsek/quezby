import type { AdminDeviceCheck, AdminPlayerResponse, AdminRunRow } from '@quezby/types';
import {
  Ban,
  CalendarDays,
  Fingerprint,
  Gamepad2,
  LogOut,
  MoreHorizontal,
  RotateCcw,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/base/button';
import { Menu, type MenuItem } from '@/components/base/menu';
import { Panel } from '@/components/base/panel';
import { Segmented } from '@/components/base/segmented';
import { Skeleton } from '@/components/base/skeleton';
import { Tag } from '@/components/base/tag';
import {
  BanPlayerDialog,
  DeletePlayerDialog,
  RenamePlayerDialog,
  SignOutPlayerDialog,
  UnbanPlayerDialog,
} from '@/components/moderation/player-dialogs';
import { BandStats } from '@/components/patterns/band-stats';
import { Callout } from '@/components/patterns/callout';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { EmptyState } from '@/components/patterns/empty-state';
import { Facts } from '@/components/patterns/facts';
import { Page } from '@/components/patterns/page';
import { ShareList } from '@/components/patterns/share-list';
import { usePlayer } from '@/hooks/api/players';
import { auditColumns, FlagTags, RunStatusTag, When } from '@/lib/columns';
import { errorMessage, isApiError } from '@/lib/errors';
import {
  DEVICE_VERDICT,
  formatCombo,
  formatDate,
  formatDateTime,
  formatNumber,
  formatRelative,
  LEAGUE_TIER,
  LEAGUE_ZONE,
  PLATFORM,
  playerName,
  PROVIDER,
  RUN_FLAG,
  RUN_MODE,
  shortId,
} from '@/lib/format';
import { can } from '@/lib/permissions';
import { useSession } from '@/stores/session';

type Tab = 'summary' | 'devices' | 'log';
type Dialog = 'ban' | 'unban' | 'rename' | 'signOut' | 'delete' | null;

const RUN_COLUMNS: Column<AdminRunRow>[] = [
  { key: 'run', header: 'Tur', cell: (run) => shortId(run.id), tone: 'mono' },
  { key: 'status', header: 'Durum', cell: (run) => <RunStatusTag status={run.status} /> },
  { key: 'mode', header: 'Mod', cell: (run) => <span className="whitespace-nowrap">{RUN_MODE[run.mode]}</span>, tone: 'muted', hideBelow: 'md' },
  { key: 'score', header: 'Skor', cell: (run) => formatNumber(run.score), align: 'end', tone: 'strong' },
  { key: 'flags', header: 'Sinyaller', cell: (run) => <FlagTags flags={run.flags} max={2} />, hideBelow: 'lg' },
  { key: 'when', header: 'Ne zaman', cell: (run) => <When at={run.finishedAt ?? run.startedAt} />, tone: 'muted' },
];

const DEVICE_COLUMNS: Column<AdminDeviceCheck>[] = [
  { key: 'when', header: 'Ne zaman', cell: (check) => <When at={check.checkedAt} as="dateTime" />, tone: 'muted' },
  { key: 'platform', header: 'Platform', cell: (check) => PLATFORM[check.platform] },
  { key: 'verdict', header: 'Karar', cell: (check) => <Tag {...DEVICE_VERDICT[check.verdict]} /> },
  { key: 'reason', header: 'Sebep', cell: (check) => check.reason ?? '—', tone: 'mono' },
  { key: 'until', header: 'Geçerli', cell: (check) => <When at={check.expiresAt} as="dateTime" />, tone: 'muted', hideBelow: 'md' },
];

/** One player: who they are, what they played, what was flagged and what was done about it. */
export function PlayerPage() {
  const { playerId = '' } = useParams();
  const player = usePlayer(playerId);
  const role = useSession((state) => state.session?.admin.role);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('summary');
  const [dialog, setDialog] = useState<Dialog>(null);

  if (player.isPending) {
    return (
      <Page title="Oyuncu" back={{ to: '/players', label: 'Oyuncular' }}>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <Skeleton className="h-72 rounded-panel" />
          <Skeleton className="h-72 rounded-panel" />
        </div>
      </Page>
    );
  }

  if (player.error || !player.data) {
    const missing = isApiError(player.error, 'not_found');
    return (
      <Page title={missing ? 'Oyuncu bulunamadı' : 'Oyuncu açılamadı'} back={{ to: '/players', label: 'Oyuncular' }}>
        {missing ? (
          <div className="rounded-panel bg-raised shadow-card">
            <EmptyState icon={<UserRound />} title="Böyle bir oyuncu yok" hint="Hesap silinmiş ya da bağlantı yanlış olabilir." />
          </div>
        ) : (
          <Callout tone="bad" title="Veri alınamadı">
            {errorMessage(player.error)}
          </Callout>
        )}
      </Page>
    );
  }

  const data = player.data;
  const me = data.player;
  const banned = me.bannedAt !== null;
  const flaggedRuns = (data.runs.flagged ?? 0) + (data.runs.review ?? 0) + (data.runs.rejected ?? 0);

  const actions: MenuItem[] = can(role, 'moderate')
    ? [
        banned
          ? { label: 'Yasağı kaldır', hint: 'Turları tablolara döner', icon: <ShieldCheck />, onSelect: () => setDialog('unban') }
          : { label: 'Yasakla', hint: 'Tablolardan sessizce çıkar', icon: <Ban />, onSelect: () => setDialog('ban'), tone: 'danger' },
        { label: 'Adı sıfırla', hint: 'Otomatik ad; oyuncu bir kez yeniden seçer', icon: <RotateCcw />, onSelect: () => setDialog('rename') },
        {
          label: 'Oturumları kapat',
          hint: me.isGuest ? 'Misafirde yapılamaz: hesap kaybolur' : 'Her cihazdan çıkarır',
          icon: <LogOut />,
          onSelect: () => setDialog('signOut'),
          disabled: me.isGuest,
        },
        ...(can(role, 'deletePlayers')
          ? (['separator', { label: 'Hesabı sil', hint: 'Geri alınamaz', icon: <Trash2 />, onSelect: () => setDialog('delete'), tone: 'danger' }] as MenuItem[])
          : []),
      ]
    : [];

  return (
    <Page
      title={playerName(me.username)}
      back={{ to: '/players', label: 'Oyuncular' }}
      description={`Katıldı ${formatDate(me.createdAt)} · son oyun ${formatRelative(me.lastPlayedAt)}`}
      eyebrow={
        <>
          <Tag tone="onBrand" label={banned ? 'Yasaklı' : 'Aktif'} icon={banned ? <Ban /> : <ShieldCheck />} />
          {me.isGuest ? <Tag tone="onBrand" label="Misafir" /> : null}
          {me.platform ? <Tag tone="onBrand" icon={<Smartphone />} label={PLATFORM[me.platform]} /> : null}
          {me.isAutoUsername ? <Tag tone="onBrand" label="Otomatik ad" /> : null}
        </>
      }
      actions={
        actions.length > 0 ? (
          <Menu
            label="Oyuncu işlemleri"
            items={actions}
            trigger={
              <Button tone="onBrand" icon={<MoreHorizontal />}>
                İşlemler
              </Button>
            }
          />
        ) : null
      }
      band={
        <BandStats
          stats={[
            { label: `Sezon ${data.season} rekoru`, value: formatNumber(data.best?.score ?? null), icon: <Trophy /> },
            { label: 'Sıralamadaki tur', value: formatNumber(data.runs.ranked ?? 0), icon: <Gamepad2 /> },
            { label: 'Sorunlu tur', value: formatNumber(flaggedRuns), icon: <ShieldAlert />, alert: flaggedRuns > 0 },
            { label: 'Açık oturum', value: formatNumber(me.sessions), icon: <Fingerprint /> },
          ]}
        />
      }
      tabs={
        <Segmented<Tab>
          aria-label="Oyuncu sayfası"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'summary', label: 'Özet', icon: <UserRound /> },
            { value: 'devices', label: 'Cihazlar', icon: <Smartphone />, count: data.devices.length },
            { value: 'log', label: 'Kayıt', icon: <ScrollText />, count: data.audit.length },
          ]}
        />
      }
    >
      {banned ? (
        <Callout tone="bad" title={`Yasaklı · ${formatDateTime(me.bannedAt)}`}>
          <p>{me.banReason ?? 'Sebep yazılmamış.'}</p>
        </Callout>
      ) : null}

      {tab === 'summary' ? <Summary data={data} /> : null}
      {tab === 'devices' ? (
        <DataTable
          title="Cihaz kontrolleri"
          description="Play Integrity ve App Attest’in bu oyuncunun telefonları için verdiği kararlar."
          icon={<Smartphone />}
          columns={DEVICE_COLUMNS}
          rows={data.devices}
          rowKey={(check) => String(check.id)}
          empty={{ title: 'Cihaz kontrolü yok', hint: 'Oyuncu henüz sıralı bir tur açmamış ya da cihaz doğrulaması kapalı.', icon: <Smartphone /> }}
        />
      ) : null}
      {tab === 'log' ? (
        <DataTable
          title="Denetim kaydı"
          description="Bu oyuncu hakkında yapılan her işlem."
          icon={<ScrollText />}
          columns={auditColumns(can(role, 'seeIps'))}
          rows={data.audit}
          rowKey={(entry) => String(entry.id)}
          empty={{ title: 'Kayıt yok', hint: 'Bu oyuncu hakkında henüz bir işlem yapılmadı.', icon: <ScrollText /> }}
          actions={
            <Button asChild size="sm" tone="ghost">
              <Link to={`/audit?subjectType=player&subjectId=${me.id}`}>Tümünü gör</Link>
            </Button>
          }
        />
      ) : null}

      <BanPlayerDialog player={me} open={dialog === 'ban'} onOpenChange={(open) => setDialog(open ? 'ban' : null)} />
      <UnbanPlayerDialog player={me} open={dialog === 'unban'} onOpenChange={(open) => setDialog(open ? 'unban' : null)} />
      <RenamePlayerDialog player={me} open={dialog === 'rename'} onOpenChange={(open) => setDialog(open ? 'rename' : null)} />
      <SignOutPlayerDialog player={me} open={dialog === 'signOut'} onOpenChange={(open) => setDialog(open ? 'signOut' : null)} />
      <DeletePlayerDialog
        player={me}
        open={dialog === 'delete'}
        onOpenChange={(open) => setDialog(open ? 'delete' : null)}
        onDone={() => navigate('/players', { replace: true })}
      />
    </Page>
  );
}

function Summary({ data }: { data: AdminPlayerResponse }) {
  const me = data.player;
  const ways = [...(me.email ? [`E-posta (${me.email})`] : []), ...me.identityDetails.map((identity) => PROVIDER[identity.provider])];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="min-w-0 space-y-6">
        <DataTable
          title="Son turlar"
          description="En son başladığı on tur."
          icon={<Gamepad2 />}
          columns={RUN_COLUMNS}
          rows={data.recentRuns}
          rowKey={(run) => run.id}
          rowTo={(run) => `/runs/${run.id}`}
          rowLabel={(run) => `Tur ${shortId(run.id)} aç`}
          empty={{ title: 'Henüz tur yok', hint: 'Oyuncu sıralı bir tur oynadığında burada görünür.', icon: <Gamepad2 /> }}
          actions={
            <Button asChild size="sm" tone="ghost">
              <Link to={`/runs?player=${me.id}`}>Tüm turları</Link>
            </Button>
          }
        />
        <Panel title="Son 30 günün sinyalleri" description="Turlarına konan hile bayrakları, en sık olan önce." icon={<ShieldAlert />} tone="warn">
          {data.flags.length > 0 ? (
            <ShareList
              label="Sinyaller"
              items={data.flags.map((flag) => ({
                key: flag.code,
                label: RUN_FLAG[flag.code]?.label ?? flag.code,
                hint: flag.severity === 'hard' ? 'sert' : 'yumuşak',
                count: flag.count,
                tone: flag.severity === 'hard' ? 'bad' : 'warn',
              }))}
            />
          ) : (
            <p className="text-meta text-ink-muted">Son 30 günde hiçbir turuna bayrak konmadı.</p>
          )}
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title="Hesap" icon={<UserRound />} tone="secondary">
          <Facts
            facts={[
              { label: 'Oyuncu kimliği', value: <span className="font-mono text-meta">{me.id}</span> },
              { label: 'Giriş yolları', value: ways.length > 0 ? ways.join(', ') : 'Misafir (yalnızca bu telefonda)' },
              { label: 'Platform', value: me.platform ? PLATFORM[me.platform] : null },
              { label: 'Kurulum kimliği', value: me.installId ? <span className="font-mono text-meta">{me.installId}</span> : null },
              { label: 'Katıldı', value: formatDateTime(me.createdAt) },
              { label: 'Son görülme', value: formatRelative(me.lastSeenAt) },
              { label: 'Açık oturum', value: formatNumber(me.sessions) },
              { label: 'Takip', value: `${formatNumber(data.follows.followers)} takipçi · ${formatNumber(data.follows.following)} takip` },
            ]}
          />
        </Panel>

        <Panel title={`Oyun · sezon ${data.season}`} icon={<Trophy />}>
          <Facts
            facts={[
              {
                label: 'Sezon rekoru',
                value: formatNumber(data.best?.score ?? null),
                hint: data.best
                  ? `${formatNumber(data.best.reels)} post · ${formatDate(data.best.achievedAt)}`
                  : me.bannedAt
                    ? 'Yasaklıyken tablolarda yer almaz; yasak kalkınca geri gelir.'
                    : undefined,
              },
              { label: 'Bugün', value: data.ranks.daily ? `#${formatNumber(data.ranks.daily)}` : null },
              { label: 'Bu hafta', value: data.ranks.weekly ? `#${formatNumber(data.ranks.weekly)}` : null },
              { label: 'Bu ay', value: data.ranks.monthly ? `#${formatNumber(data.ranks.monthly)}` : null },
              { label: 'Tüm zamanlar', value: data.ranks.all ? `#${formatNumber(data.ranks.all)}` : null },
              {
                label: 'Lig',
                value: data.league ? (
                  <Link to={`/leagues/${data.league.groupId}`} className="hover:text-primary-text hover:underline">
                    {LEAGUE_TIER[data.league.tier]} · {formatNumber(data.league.rank)}/{formatNumber(data.league.members)}
                  </Link>
                ) : null,
                hint: data.league ? `${formatNumber(data.league.points)} puan · ${LEAGUE_ZONE[data.league.zone].label}` : undefined,
              },
              { label: 'Tur', value: formatNumber(data.stats.runs) },
              { label: 'Post', value: formatNumber(data.stats.reels) },
              { label: 'Mükemmel', value: formatNumber(data.stats.perfects) },
              { label: 'En hızlı tepki', value: data.stats.bestReactionMs === null ? null : `${formatNumber(data.stats.bestReactionMs)} ms` },
              { label: 'En yüksek kombo', value: formatCombo(data.stats.maxCombo) },
            ]}
          />
        </Panel>

        {data.sameInstall.length > 0 ? (
          <Panel title="Aynı cihazdaki hesaplar" description="Aynı kurulumdan açılmış diğer hesaplar." icon={<Users />} tone="warn">
            <ul className="space-y-2">
              {data.sameInstall.map((other) => (
                <li key={other.id}>
                  <Link to={`/players/${other.id}`} className="flex items-center justify-between gap-3 rounded-control px-2 py-1.5 hover:bg-fill">
                    <span className="font-semibold text-ink">{playerName(other.username)}</span>
                    {other.bannedAt ? <Tag tone="bad" label="Yasaklı" /> : <CalendarDays aria-hidden className="size-4 text-ink-faint" />}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
