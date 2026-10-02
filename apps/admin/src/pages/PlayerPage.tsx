import type {
  AdminDeviceCheck,
  AdminPlayerDevice,
  AdminPlayerRating,
  AdminPlayerResponse,
  AdminRatingChange,
  AdminRunRow,
  AdminVisit,
  ReportReason,
} from '@quezby/types';
import {
  Activity,
  Ban,
  CalendarDays,
  ExternalLink,
  Fingerprint,
  Flag,
  FlagOff,
  Gamepad2,
  Gauge,
  History,
  Image as ImageIcon,
  ImageOff,
  LogOut,
  Milestone,
  MonitorSmartphone,
  MoreHorizontal,
  PencilLine,
  RotateCcw,
  Route,
  ScrollText,
  Shield,
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

import { Avatar } from '@/components/base/avatar';
import { Button } from '@/components/base/button';
import { Menu, type MenuItem } from '@/components/base/menu';
import { Panel } from '@/components/base/panel';
import { Segmented } from '@/components/base/segmented';
import { Skeleton } from '@/components/base/skeleton';
import { Tag } from '@/components/base/tag';
import { Journey } from '@/components/analytics/journey';
import {
  BanPlayerDialog,
  DeletePlayerDialog,
  DismissReportsDialog,
  RemoveAvatarDialog,
  RenamePlayerDialog,
  SetRatingDialog,
  SignOutPlayerDialog,
  UnbanPlayerDialog,
} from '@/components/moderation/player-dialogs';
import { ActivityStrip } from '@/components/patterns/activity-strip';
import { BandStats } from '@/components/patterns/band-stats';
import { Callout } from '@/components/patterns/callout';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { EmptyState } from '@/components/patterns/empty-state';
import { Facts } from '@/components/patterns/facts';
import { Page } from '@/components/patterns/page';
import { ShareList } from '@/components/patterns/share-list';
import { usePlayerActivity } from '@/hooks/api/analytics';
import { usePlayer } from '@/hooks/api/players';
import { auditColumns, EloDelta, FlagTags, RunStatusTag, TierTag, When } from '@/lib/columns';
import { errorMessage, isApiError } from '@/lib/errors';
import {
  ACTIVITY_STATUS,
  DEVICE_VERDICT,
  formatCombo,
  formatDate,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatRatingMove,
  formatRelative,
  LEAGUE_TIER,
  LOCALE_LABEL,
  MILESTONE,
  PLATFORM,
  playerName,
  PROVIDER,
  RATING_KIND,
  REPORT_REASON,
  RUN_FLAG,
  RUN_MODE,
  shortId,
} from '@/lib/format';
import { can } from '@/lib/permissions';
import { useSession } from '@/stores/session';

type Tab = 'summary' | 'activity' | 'devices' | 'log';
type Dialog = 'ban' | 'unban' | 'rename' | 'signOut' | 'avatar' | 'dismiss' | 'rating' | 'delete' | null;

const REASONS = Object.keys(REPORT_REASON) as ReportReason[];

const RUN_COLUMNS: Column<AdminRunRow>[] = [
  { key: 'run', header: 'Tur', cell: (run) => shortId(run.id), tone: 'mono' },
  { key: 'status', header: 'Durum', cell: (run) => <RunStatusTag status={run.status} /> },
  { key: 'mode', header: 'Mod', cell: (run) => <span className="whitespace-nowrap">{RUN_MODE[run.mode]}</span>, tone: 'muted', hideBelow: 'md' },
  { key: 'score', header: 'Skor', cell: (run) => formatNumber(run.score), align: 'end', tone: 'strong' },
  { key: 'flags', header: 'Sinyaller', cell: (run) => <FlagTags flags={run.flags} max={2} />, hideBelow: 'lg' },
  { key: 'when', header: 'Ne zaman', cell: (run) => <When at={run.finishedAt ?? run.startedAt} />, tone: 'muted' },
];

/** A run's score over the target it played against; a change with neither is a dash. */
function ScoreVsTarget({ score, target }: { score: number | null; target: number | null }) {
  if (score === null && target === null) return <span className="text-ink-faint">—</span>;
  return (
    <span className="whitespace-nowrap">
      <span className="block font-semibold text-ink">{formatNumber(score)}</span>
      {target !== null ? <span className="block text-micro font-medium text-ink-faint">hedef {formatNumber(target)}</span> : null}
    </span>
  );
}

const RATING_COLUMNS: Column<AdminRatingChange>[] = [
  {
    key: 'kind',
    header: 'Ne',
    cell: (change) => (
      <span className="flex flex-wrap items-center gap-1">
        <Tag tone={RATING_KIND[change.kind].tone} label={RATING_KIND[change.kind].label} title={RATING_KIND[change.kind].hint} />
        {change.shielded ? <Tag tone="neutral" icon={<Shield />} label="Kalkan" title="Yeni yükselişin kalkanı onu liginde tuttu." /> : null}
      </span>
    ),
  },
  {
    key: 'delta',
    header: 'Değişim',
    cell: (change) => (change.counted ? <EloDelta value={change.delta} /> : <span className="text-ink-faint">—</span>),
    align: 'end',
  },
  { key: 'rating', header: 'Reyting', cell: (change) => <span className="whitespace-nowrap">{formatRatingMove(change.before, change.after)}</span>, tone: 'muted', hideBelow: 'md' },
  { key: 'score', header: 'Skor', cell: (change) => <ScoreVsTarget score={change.score} target={change.target} />, align: 'end', hideBelow: 'lg' },
  { key: 'run', header: 'Tur', cell: (change) => (change.runId ? shortId(change.runId) : '—'), tone: 'mono', hideBelow: 'xl' },
  { key: 'when', header: 'Ne zaman', cell: (change) => <When at={change.at} />, tone: 'muted' },
];

const INSTALL_COLUMNS: Column<AdminPlayerDevice>[] = [
  {
    key: 'phone',
    header: 'Telefon',
    cell: (device) => (
      <span className="min-w-0">
        <span className="block truncate font-semibold text-ink">{device.model ?? 'Bilinmeyen model'}</span>
        <span className="block truncate text-micro text-ink-faint">
          {device.platform ? PLATFORM[device.platform] : '—'} {device.osVersion ?? ''}
          {device.brand ? ` · ${device.brand}` : ''}
        </span>
      </span>
    ),
  },
  {
    key: 'app',
    header: 'Uygulama',
    cell: (device) => (device.appVersion ? `${device.appVersion}${device.appBuild ? ` (${device.appBuild})` : ''}` : '—'),
    tone: 'mono',
  },
  { key: 'first', header: 'İlk görülme', cell: (device) => <When at={device.firstSeenAt} as="date" />, tone: 'muted', hideBelow: 'md' },
  { key: 'last', header: 'Son görüldüğü gün', cell: (device) => <When at={device.lastSeenAt} as="date" />, tone: 'muted' },
  {
    key: 'others',
    header: 'Aynı telefonda',
    cell: (device) =>
      device.others.length > 0 ? (
        <span className="flex flex-wrap gap-1.5">
          {device.others.map((other) => (
            <Link key={other.id} to={`/players/${other.id}`} className="font-semibold text-ink hover:text-primary-text hover:underline">
              {playerName(other.username)}
            </Link>
          ))}
        </span>
      ) : (
        '—'
      ),
    hideBelow: 'lg',
  },
];

const VISIT_COLUMNS: Column<AdminVisit>[] = [
  { key: 'when', header: 'Başladı', cell: (visit) => <When at={visit.startedAt} as="dateTime" />, tone: 'muted' },
  { key: 'length', header: 'Süre', cell: (visit) => formatDuration(visit.seconds * 1000), align: 'end', tone: 'strong' },
  { key: 'journey', header: 'Yolculuk', cell: (visit) => <Journey steps={visit.journey} />, hideBelow: 'md' },
  {
    key: 'app',
    header: 'Sürüm',
    cell: (visit) => `${visit.platform ? PLATFORM[visit.platform] : ''} ${visit.appVersion ?? ''}`.trim() || '—',
    tone: 'muted',
    hideBelow: 'lg',
  },
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
  const moderator = can(role, 'moderate');
  const setsRatings = can(role, 'setRatings');
  const flaggedRuns = (data.runs.flagged ?? 0) + (data.runs.review ?? 0) + (data.runs.rejected ?? 0);
  const openReports = data.openReports.photo + data.openReports.name;

  const actions: MenuItem[] = moderator
    ? [
        banned
          ? { label: 'Yasağı kaldır', hint: 'Turları tablolara döner', icon: <ShieldCheck />, onSelect: () => setDialog('unban') }
          : { label: 'Yasakla', hint: 'Tablolardan sessizce çıkar', icon: <Ban />, onSelect: () => setDialog('ban'), tone: 'danger' },
        { label: 'Adı sıfırla', hint: 'Otomatik ad; oyuncu bir kez yeniden seçer', icon: <RotateCcw />, onSelect: () => setDialog('rename') },
        ...(me.avatarUrl
          ? [
              {
                label: 'Fotoğrafı kaldır',
                hint: 'Fotoğraf bildirimleri de kapanır',
                icon: <ImageOff />,
                onSelect: () => setDialog('avatar'),
                tone: 'danger',
              } satisfies MenuItem,
            ]
          : []),
        ...(openReports > 0
          ? [{ label: 'Bildirimleri kapat', hint: 'İşlem yapmadan kapatır', icon: <FlagOff />, onSelect: () => setDialog('dismiss') } satisfies MenuItem]
          : []),
        {
          label: 'Oturumları kapat',
          hint: me.isGuest ? 'Misafirde yapılamaz: hesap kaybolur' : 'Her cihazdan çıkarır',
          icon: <LogOut />,
          onSelect: () => setDialog('signOut'),
          disabled: me.isGuest,
        },
        ...(setsRatings
          ? [{ label: 'qb’yi değiştir', hint: 'Elle; ligi de değişir', icon: <PencilLine />, onSelect: () => setDialog('rating') } satisfies MenuItem]
          : []),
        ...(can(role, 'deletePlayers')
          ? (['separator', { label: 'Hesabı sil', hint: 'Geri alınamaz', icon: <Trash2 />, onSelect: () => setDialog('delete'), tone: 'danger' }] as MenuItem[])
          : []),
      ]
    : [];

  return (
    <Page
      title={playerName(me.username)}
      back={{ to: '/players', label: 'Oyuncular' }}
      leading={<Avatar name={me.username} src={me.avatarUrl} tone="onBrand" size="xl" className="ring-2 ring-on-brand/30" />}
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
            { label: 'Açık bildirim', value: formatNumber(openReports), icon: <Flag />, alert: openReports > 0 },
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
            { value: 'activity', label: 'Etkinlik', icon: <Activity /> },
            { value: 'devices', label: 'Cihazlar', icon: <Smartphone />, count: data.installs.length },
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

      {tab === 'summary' ? <Summary data={data} moderator={moderator} setsRatings={setsRatings} onDialog={setDialog} /> : null}
      {tab === 'activity' ? <ActivityTab playerId={me.id} /> : null}
      {tab === 'devices' ? (
        <div className="space-y-6">
          <DataTable
            title="Cihaz kaydı"
            description="Oyuncunun kullandığı telefonlar; izin verip vermediğine bakmadan, destek ve güvenlik için tutulur."
            icon={<MonitorSmartphone />}
            columns={INSTALL_COLUMNS}
            rows={data.installs}
            rowKey={(device) => device.installId}
            empty={{ title: 'Kayıtlı telefon yok', hint: 'Uygulama API’ye bağlandığında telefon günde bir kez kaydedilir.', icon: <MonitorSmartphone /> }}
          />
          <DataTable
            title="Cihaz kontrolleri"
            description="Play Integrity ve App Attest’in bu oyuncunun telefonları için verdiği kararlar."
            icon={<Smartphone />}
            columns={DEVICE_COLUMNS}
            rows={data.devices}
            rowKey={(check) => String(check.id)}
            empty={{ title: 'Cihaz kontrolü yok', hint: 'Oyuncu henüz sıralı bir tur açmamış ya da cihaz doğrulaması kapalı.', icon: <Smartphone /> }}
          />
        </div>
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
      <RemoveAvatarDialog player={me} open={dialog === 'avatar'} onOpenChange={(open) => setDialog(open ? 'avatar' : null)} />
      <DismissReportsDialog player={me} open={dialog === 'dismiss'} onOpenChange={(open) => setDialog(open ? 'dismiss' : null)} />
      <SetRatingDialog
        player={me}
        rating={data.rating?.rating ?? null}
        open={dialog === 'rating'}
        onOpenChange={(open) => setDialog(open ? 'rating' : null)}
      />
      <DeletePlayerDialog
        player={me}
        open={dialog === 'delete'}
        onOpenChange={(open) => setDialog(open ? 'delete' : null)}
        onDone={() => navigate('/players', { replace: true })}
      />
    </Page>
  );
}

function Summary({
  data,
  moderator,
  setsRatings,
  onDialog,
}: {
  data: AdminPlayerResponse;
  /** Whether the admin may act on the player: the photo and the reports get their buttons. */
  moderator: boolean;
  /** Whether the admin may set the player's qb by hand: an owner. */
  setsRatings: boolean;
  onDialog: (dialog: 'avatar' | 'dismiss' | 'rating') => void;
}) {
  const me = data.player;
  const ways = [...(me.email ? [`E-posta (${me.email})`] : []), ...me.identityDetails.map((identity) => PROVIDER[identity.provider])];
  const openReports = data.openReports.photo + data.openReports.name;

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
        {data.rating ? (
          <DataTable
            title="Reyting geçmişi"
            description="Son otuz değişim, en yeni önce; sayılmayan turlar da."
            icon={<History />}
            tone="secondary"
            columns={RATING_COLUMNS}
            rows={data.rating.history}
            rowKey={(change) => String(change.id)}
            rowTo={(change) => (change.runId ? `/runs/${change.runId}` : null)}
            rowLabel={(change) => `Tur ${shortId(change.runId ?? '')} aç`}
            rowMuted={(change) => !change.counted}
            empty={{ title: 'Henüz değişim yok', hint: 'Sayılan her tur reytingi burada oynatır.', icon: <History /> }}
          />
        ) : null}
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
        {openReports > 0 ? (
          <Panel
            title="Açık bildirimler"
            description="Oyuncuların fotoğrafı ya da adı için yaptığı, henüz kapanmamış bildirimler."
            icon={<Flag />}
            tone="warn"
            actions={
              moderator ? (
                <Button size="sm" tone="ghost" icon={<FlagOff />} onClick={() => onDialog('dismiss')}>
                  Bildirimleri kapat
                </Button>
              ) : null
            }
          >
            <div className="space-y-3">
              <Facts facts={REASONS.map((reason) => ({ label: REPORT_REASON[reason], value: `${formatNumber(data.openReports[reason])} bildirim` }))} />
              <p className="text-meta text-ink-muted">Fotoğrafı kaldırmak fotoğraf bildirimlerini, adı sıfırlamak ad bildirimlerini kapatır.</p>
            </div>
          </Panel>
        ) : null}

        {me.avatarUrl ? (
          <Panel
            title="Profil fotoğrafı"
            description="Oyuncuların gördüğü haliyle."
            icon={<ImageIcon />}
            tone="secondary"
            actions={
              moderator ? (
                <Button size="sm" tone="danger" icon={<ImageOff />} onClick={() => onDialog('avatar')}>
                  Fotoğrafı kaldır
                </Button>
              ) : null
            }
          >
            <div className="flex flex-col items-center gap-3">
              <Avatar name={me.username} src={me.avatarUrl} alt={`${playerName(me.username)} profil fotoğrafı`} size="2xl" />
              <a
                href={me.avatarUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-meta font-semibold text-ink-muted hover:text-primary-text hover:underline"
              >
                <ExternalLink aria-hidden className="size-3.5" />
                Tam boyutta aç
              </a>
            </div>
          </Panel>
        ) : null}

        <Panel title="Hesap" icon={<UserRound />} tone="secondary">
          <Facts
            facts={[
              { label: 'Oyuncu kimliği', value: <span className="font-mono text-meta">{me.id}</span> },
              { label: 'Giriş yolları', value: ways.length > 0 ? ways.join(', ') : 'Misafir (yalnızca bu telefonda)' },
              { label: 'Platform', value: me.platform ? PLATFORM[me.platform] : null },
              { label: 'Dil', value: LOCALE_LABEL[me.locale] },
              { label: 'Kurulum kimliği', value: me.installId ? <span className="font-mono text-meta">{me.installId}</span> : null },
              { label: 'Katıldı', value: formatDateTime(me.createdAt) },
              { label: 'Son görülme', value: formatRelative(me.lastSeenAt) },
              {
                label: 'Kullanım verisi',
                value: me.analyticsAt ? `İzinli · ${formatDate(me.analyticsAt)}` : 'İzin yok',
                hint: me.analyticsAt ? undefined : 'Yalnızca cihaz kaydı ve oyun verisi tutulur.',
              },
              { label: 'Açık oturum', value: formatNumber(me.sessions) },
              { label: 'Arkadaş', value: formatNumber(data.social.friends) },
              {
                label: 'Engelleyen',
                value: formatNumber(data.social.blockedBy),
                hint: data.social.blockedBy > 0 ? 'Onu engelleyen oyuncular: bakmaya değer bir işaret.' : undefined,
              },
            ]}
          />
        </Panel>

        <RatingPanel rating={data.rating} onSet={setsRatings ? () => onDialog('rating') : undefined} />

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
              { label: 'Bu hafta', value: data.ranks.weekly ? `#${formatNumber(data.ranks.weekly)}` : null },
              { label: 'Bu ay', value: data.ranks.monthly ? `#${formatNumber(data.ranks.monthly)}` : null },
              { label: 'Tüm zamanlar', value: data.ranks.all ? `#${formatNumber(data.ranks.all)}` : null },
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

/**
 * Where the player's rating stands: their league and next target once
 * placed, the placement runs until then, and what still speeds or shields it.
 * An owner can set it by hand from here (`onSet`).
 */
function RatingPanel({ rating, onSet }: { rating: AdminPlayerRating | null; onSet?: () => void }) {
  const set = onSet ? (
    <Button size="sm" tone="ghost" icon={<PencilLine />} onClick={onSet}>
      qb’yi değiştir
    </Button>
  ) : null;

  if (!rating) {
    return (
      <Panel title="Reyting" icon={<Gauge />} tone="secondary" actions={set} flush>
        <EmptyState icon={<Gauge />} title="Henüz reyting yok" hint="İlk sayılan turuyla yerleşmeye başlar." />
      </Panel>
    );
  }

  return (
    <Panel title="Reyting" icon={<Gauge />} tone="secondary" actions={set}>
      <Facts
        facts={[
          {
            label: 'Reyting',
            value:
              rating.rating === null ? (
                <Tag label="Yerleşmede" />
              ) : (
                <span className="inline-flex flex-wrap items-center justify-end gap-2">
                  <span className="tabular">{formatNumber(rating.rating)}</span>
                  {rating.tier ? <TierTag tier={rating.tier} /> : null}
                </span>
              ),
          },
          ...(rating.placement
            ? [
                {
                  label: 'Yerleşme',
                  value: `${formatNumber(rating.placement.played)} / ${formatNumber(rating.placement.required)} tur`,
                  hint: 'Sonuncusu oyuncuyu medyan skoruyla yerleştirir.',
                },
              ]
            : []),
          { label: 'En yüksek', value: formatNumber(rating.peak) },
          { label: 'Zorluk', value: formatNumber(rating.difficulty), hint: 'Sıradaki dereceli turun oynandığı zorluk' },
          {
            label: 'Sonraki hedef',
            value: formatNumber(rating.target),
            hint: rating.target === null ? undefined : 'Reyting kazanmak için geçmesi gereken skor',
          },
          ...(rating.provisionalLeft > 0
            ? [
                {
                  label: 'Geçici dönem',
                  value: `${formatNumber(rating.provisionalLeft)} tur daha`,
                  hint: 'Değişimler daha büyük: yeni yerleşti ya da uzun aradan döndü.',
                },
              ]
            : []),
          ...(rating.shield
            ? [
                {
                  label: 'Terfi kalkanı',
                  value: `${LEAGUE_TIER[rating.shield.tier]} · ${formatNumber(rating.shield.runs)} tur`,
                  hint: 'Yeni yükseldi: bu turlarda liginden düşmez.',
                },
              ]
            : []),
          { label: 'Sayılan tur', value: formatNumber(rating.ratedRuns) },
          { label: 'Son sayılan', value: formatRelative(rating.ratedAt) },
        ]}
      />
    </Panel>
  );
}

/** The player's use of the game: their last 30 days, their latest visits and their firsts. */
function ActivityTab({ playerId }: { playerId: string }) {
  const activity = usePlayerActivity(playerId);

  if (activity.isPending) {
    return (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Skeleton className="h-72 rounded-panel" />
        <Skeleton className="h-72 rounded-panel" />
      </div>
    );
  }
  if (activity.error || !activity.data) {
    return (
      <Callout tone="bad" title="Etkinlik alınamadı">
        {errorMessage(activity.error)}
      </Callout>
    );
  }

  const data = activity.data;
  const status = ACTIVITY_STATUS[data.status];

  return (
    <div className="space-y-6">
      {data.status === 'tracked' ? null : (
        <Callout tone={data.status === 'disabled' ? 'bad' : 'info'} title={status.label}>
          {status.hint}
        </Callout>
      )}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          <Panel title="Son 30 gün" description="Her gün bir kare: gelmediği günler gri, kaldıkça yeşil." icon={<Activity />} tone="ok">
            <div className="space-y-5">
              <ActivityStrip days={data.days} label="Son 30 günün etkinliği" />
              <Facts
                facts={[
                  { label: 'Aktif gün', value: `${formatNumber(data.summary.activeDays)} / 30` },
                  { label: 'Ziyaret', value: formatNumber(data.summary.visits) },
                  { label: 'Oyunda geçen süre', value: formatDuration(data.summary.seconds * 1000) },
                  {
                    label: 'Ortalama ziyaret',
                    value: data.summary.avgVisitSeconds === null ? null : formatDuration(data.summary.avgVisitSeconds * 1000),
                  },
                  { label: 'Kayıtlı ilk ve son gün', value: data.summary.firstDay ? `${formatDate(data.summary.firstDay)} – ${formatDate(data.summary.lastDay)}` : null },
                ]}
              />
            </div>
          </Panel>
          <DataTable
            title="Son ziyaretler"
            description="Uygulamanın ön plana her gelişi, gezdiği ekranlar ve anlarıyla. 30 gün tutulur."
            icon={<Route />}
            columns={VISIT_COLUMNS}
            rows={data.visits}
            rowKey={(visit) => String(visit.id)}
            empty={{
              title: 'Ziyaret yok',
              hint: data.status === 'tracked' ? 'Uygulamayı arka plana attığında ziyareti gelir.' : 'Bu oyuncunun ziyareti tutulmuyor.',
              icon: <Route />,
            }}
          />
        </div>
        <Panel title="İlkler" description="Oyuncunun hayatındaki ilk kezler, eskiden yeniye." icon={<Milestone />} tone="secondary">
          <Facts facts={data.milestones.map((first) => ({ label: MILESTONE[first.milestone], value: formatDateTime(first.at) }))} />
        </Panel>
      </div>
    </div>
  );
}
