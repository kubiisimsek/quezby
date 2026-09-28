import type { AdminRunResponse } from '@quezby/types';
import {
  CircleCheck,
  CircleX,
  Clock,
  Crosshair,
  Gamepad2,
  Hash,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Swords,
  Timer,
  Trophy,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Button } from '@/components/base/button';
import { Panel } from '@/components/base/panel';
import { Skeleton } from '@/components/base/skeleton';
import { Tag } from '@/components/base/tag';
import { ApproveRunDialog, RejectRunDialog } from '@/components/moderation/run-dialogs';
import { BandStats } from '@/components/patterns/band-stats';
import { Callout } from '@/components/patterns/callout';
import { DataTable } from '@/components/patterns/data-table';
import { EmptyState } from '@/components/patterns/empty-state';
import { Facts } from '@/components/patterns/facts';
import { Page } from '@/components/patterns/page';
import { RunTimeline } from '@/components/patterns/run-timeline';
import { useRun } from '@/hooks/api/runs';
import { auditColumns } from '@/lib/columns';
import { errorMessage, isApiError } from '@/lib/errors';
import {
  DEVICE_VERDICT,
  DUEL_STATUS,
  END_REASON,
  formatDateTime,
  formatDayKey,
  formatDuration,
  formatMs,
  formatNumber,
  formatPerMille,
  playerName,
  RUN_FLAG,
  RUN_MODE,
  RUN_STATUS,
  SEVERITY,
  shortId,
} from '@/lib/format';
import { can, isApprovable, isRejectable } from '@/lib/permissions';
import { useSession } from '@/stores/session';

const UNAVAILABLE = {
  no_log: 'Tur bitmediği için hamle kaydı yok; tekrar oynatılacak bir şey yok.',
  other_engine: 'Tur başka bir sezonun kurallarıyla oynandı; bugünün motoru onu tekrar oynatamaz.',
  engine_error: 'Motor bu hamle kaydını kabul etmedi; tur bu yüzden reddedildi.',
} as const;

/** A flag's measured values as label and value; milliseconds read as such. */
function detailValue(key: string, value: unknown): string {
  if (typeof value === 'number') return /ms$/i.test(key) ? formatMs(value) : formatNumber(value);
  if (value === null || value === undefined) return '—';
  return String(value);
}

/** One run: what the API's replay made of it, the signals it tripped, and the decision on it. */
export function RunPage() {
  const { runId = '' } = useParams();
  const run = useRun(runId);
  const role = useSession((state) => state.session?.admin.role);
  const [dialog, setDialog] = useState<'approve' | 'reject' | null>(null);

  if (run.isPending) {
    return (
      <Page title="Tur" back={{ to: '/runs', label: 'Turlar' }}>
        <Skeleton className="h-72 rounded-panel" />
      </Page>
    );
  }
  if (run.error || !run.data) {
    const missing = isApiError(run.error, 'not_found');
    return (
      <Page title={missing ? 'Tur bulunamadı' : 'Tur açılamadı'} back={{ to: '/runs', label: 'Turlar' }}>
        {missing ? (
          <div className="rounded-panel bg-raised shadow-card">
            <EmptyState icon={<Gamepad2 />} title="Böyle bir tur yok" hint="Oyuncunun hesabı silinmiş ya da bağlantı yanlış olabilir." />
          </div>
        ) : (
          <Callout tone="bad" title="Veri alınamadı">
            {errorMessage(run.error)}
          </Callout>
        )}
      </Page>
    );
  }

  const data = run.data;
  const me = data.run;
  const moderator = can(role, 'moderate');
  const canApprove = moderator && isApprovable(me);
  const canReject = moderator && isRejectable(me);

  return (
    <Page
      title={`Tur ${shortId(me.id)}`}
      back={{ to: '/runs', label: 'Turlar' }}
      description={`${playerName(me.player.username)} · ${formatDateTime(me.startedAt)}`}
      eyebrow={
        <>
          <Tag tone="onBrand" label={RUN_STATUS[me.status].label} title={RUN_STATUS[me.status].hint} />
          <Tag tone="onBrand" label={me.mode === 'daily' && me.dailyKey ? `${RUN_MODE.daily} · ${formatDayKey(me.dailyKey)}` : RUN_MODE[me.mode]} />
          <Tag tone="onBrand" icon={<Hash />} label={`Sezon ${me.engineVersion}`} />
        </>
      }
      actions={
        canApprove || canReject ? (
          <>
            {canApprove ? (
              <Button tone="onBrand" icon={<CircleCheck />} onClick={() => setDialog('approve')}>
                Onayla
              </Button>
            ) : null}
            {canReject ? (
              <Button tone="onBrandSoft" icon={<CircleX />} onClick={() => setDialog('reject')}>
                Reddet
              </Button>
            ) : null}
          </>
        ) : null
      }
      band={
        <BandStats
          stats={[
            { label: 'Skor', value: formatNumber(me.score), icon: <Trophy /> },
            { label: 'Post', value: formatNumber(me.reels), icon: <Gamepad2 /> },
            { label: 'İsabet', value: formatPerMille(me.accuracy), icon: <Crosshair /> },
            { label: 'Ortalama tepki', value: formatMs(me.avgReactionMs), icon: <Timer /> },
            { label: 'Sinyal', value: formatNumber(me.flags.length), icon: <ShieldAlert />, alert: me.flags.some((flag) => flag.severity === 'hard') },
          ]}
        />
      }
    >
      {me.status === 'review' ? (
        <Callout tone="warn" title="Bu tur incelemede">
          <p>Yumuşak bir sinyali var ve skoru sezonun ya da haftanın zirvesine girecek. Onaylanana kadar hiçbir tabloda görünmez.</p>
        </Callout>
      ) : null}
      {me.mode === 'vs' ? (
        <Callout tone="info" icon={<Swords />} title="VS turu: hiçbir yere sayılmaz">
          <p>
            İki arkadaşın aynı tohumla oynadığı bir VS’in turu. Tabloya, lige ya da istatistiğe girmez; bu yüzden onaylanmaz ve reddedilmez. Temiz
            değilse VS’ini kaybeder; VS’i başlatanın turuysa VS hiç gönderilmez.
          </p>
          {me.duel ? (
            <p className="mt-2 flex flex-wrap items-center gap-2">
              <span>VS ·</span>
              <Link to={`/players/${me.duel.challenger.id}`} className="font-medium hover:text-primary-text hover:underline">
                {playerName(me.duel.challenger.username)}
              </Link>
              <span className="tabular-nums">
                {me.duel.challengerScore === null ? '—' : formatNumber(me.duel.challengerScore)} –{' '}
                {me.duel.opponentScore === null ? '—' : formatNumber(me.duel.opponentScore)}
              </span>
              <Link to={`/players/${me.duel.opponent.id}`} className="font-medium hover:text-primary-text hover:underline">
                {playerName(me.duel.opponent.username)}
              </Link>
              <Tag tone={DUEL_STATUS[me.duel.status].tone} label={DUEL_STATUS[me.duel.status].label} />
            </p>
          ) : null}
        </Callout>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          <Panel title="Sinyaller" description="Hile korumasının bu tura koyduğu bayraklar ve ölçtükleri." icon={<ShieldAlert />} tone="warn">
            {me.flags.length === 0 ? (
              <p className="text-meta text-ink-muted">Bu turda hiçbir sinyal yok.</p>
            ) : (
              <ul className="space-y-3">
                {me.flags.map((flag, index) => (
                  <li key={`${flag.code}-${index}`} className="rounded-panel bg-sunken/60 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag tone={SEVERITY[flag.severity].tone} label={SEVERITY[flag.severity].label} />
                      <span className="text-heading text-ink">{RUN_FLAG[flag.code]?.label ?? flag.code}</span>
                      <span className="font-mono text-micro text-ink-faint">{flag.code}</span>
                    </div>
                    <p className="mt-1 text-meta text-ink-muted">{RUN_FLAG[flag.code]?.hint}</p>
                    {Object.keys(flag.details).length > 0 ? (
                      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-meta">
                        {Object.entries(flag.details).map(([key, value]) => (
                          <div key={key} className="flex gap-1.5">
                            <dt className="font-mono text-ink-faint">{key}</dt>
                            <dd className="font-semibold text-ink">{detailValue(key, value)}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Post post" description="API’nin kendi motoruyla tekrar oynattığı haliyle, her post ve kararı." icon={<Clock />}>
            {data.timeline ? (
              <RunTimeline steps={data.timeline} />
            ) : (
              <Callout tone="info">{UNAVAILABLE[data.timelineUnavailable ?? 'no_log']}</Callout>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <RunFacts data={data} />
          <DataTable
            title="Kayıt"
            icon={<ScrollText />}
            columns={auditColumns(can(role, 'seeIps')).filter((column) => column.key !== 'subject')}
            rows={data.audit}
            rowKey={(entry) => String(entry.id)}
            empty={{ title: 'Kayıt yok', hint: 'Bu tur hakkında henüz bir karar verilmedi.', icon: <ScrollText /> }}
          />
        </div>
      </div>

      <ApproveRunDialog run={me} open={dialog === 'approve'} onOpenChange={(open) => setDialog(open ? 'approve' : null)} />
      <RejectRunDialog run={me} open={dialog === 'reject'} onOpenChange={(open) => setDialog(open ? 'reject' : null)} />
    </Page>
  );
}

function RunFacts({ data }: { data: AdminRunResponse }) {
  const me = data.run;
  const scoreMatches = me.clientScore === null || me.clientScore === me.score;

  return (
    <>
      <Panel title="Tur" icon={<Gamepad2 />} tone="secondary">
        <Facts
          facts={[
            {
              label: 'Oyuncu',
              value: (
                <Link to={`/players/${me.player.id}`} className="hover:text-primary-text hover:underline">
                  {playerName(me.player.username)}
                </Link>
              ),
            },
            { label: 'Başladı', value: formatDateTime(me.startedAt) },
            { label: 'Bitti', value: formatDateTime(me.finishedAt) },
            { label: 'Oyun süresi', value: formatDuration(me.activeMs) },
            { label: 'Nasıl bitti', value: me.endedBy ? END_REASON[me.endedBy] : null },
            { label: 'Seviye', value: formatNumber(me.level) },
            { label: 'İsabet · kaçan · mükemmel', value: `${formatNumber(me.hits)} · ${formatNumber(me.misses)} · ${formatNumber(me.perfects)}` },
            { label: 'En uzun seri', value: formatNumber(me.maxStreak) },
            { label: 'Bonus', value: formatNumber(me.bonusPoints) },
            { label: 'Cihaz', value: me.deviceVerdict ? <Tag {...DEVICE_VERDICT[me.deviceVerdict]} /> : 'Karar yok' },
            { label: 'Uygulama', value: me.appVersion },
            { label: 'Tohum', value: <span className="font-mono text-meta">{me.seed}</span> },
          ]}
        />
      </Panel>

      <Panel
        title="Sunucu ve uygulama"
        description="Skoru her zaman sunucunun tekrarı belirler; uygulamanın söylediği yalnızca karşılaştırılır."
        icon={scoreMatches ? <ShieldCheck /> : <ShieldAlert />}
        tone={scoreMatches ? 'ok' : 'bad'}
      >
        <Facts
          facts={[
            { label: 'Sunucunun skoru', value: formatNumber(me.score) },
            { label: 'Uygulamanın skoru', value: formatNumber(me.clientScore) },
            { label: 'Sunucunun post sayısı', value: formatNumber(me.reels) },
            { label: 'Uygulamanın post sayısı', value: formatNumber(me.clientReels) },
            { label: 'Uyuşuyor mu', value: <Tag tone={scoreMatches ? 'ok' : 'bad'} label={scoreMatches ? 'Evet' : 'Hayır'} /> },
          ]}
        />
      </Panel>
    </>
  );
}
