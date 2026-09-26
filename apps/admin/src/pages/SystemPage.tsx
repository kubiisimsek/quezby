import type { AdminSystemAction } from '@quezby/types';
import { Database, Gauge, Gamepad2, Hourglass, RefreshCw, Server, ShieldCheck, Terminal, Wrench } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/base/button';
import { Panel } from '@/components/base/panel';
import { Skeleton } from '@/components/base/skeleton';
import { Tag } from '@/components/base/tag';
import { BandStats } from '@/components/patterns/band-stats';
import { Callout } from '@/components/patterns/callout';
import { ConfirmModal } from '@/components/patterns/confirm-modal';
import { Facts } from '@/components/patterns/facts';
import { Page } from '@/components/patterns/page';
import { useSystem, useSystemAction } from '@/hooks/api/system';
import { errorMessage } from '@/lib/errors';
import { formatDateTime, formatNumber } from '@/lib/format';

const CHORES: Record<AdminSystemAction, { title: string; description: string; label: string; done: string }> = {
  migrate: {
    title: 'Bekleyen migration’lar çalışsın mı?',
    description: 'Yüklenen yeni sürümün veritabanı değişiklikleri uygulanır. Yedeğin olduğundan emin ol; geri almak elle yapılır.',
    label: 'Migration’ları çalıştır',
    done: 'Migration’lar çalıştı',
  },
  optimize: {
    title: 'Önbellek yenilensin mi?',
    description: 'Yapılandırma, rota ve görünüm önbellekleri silinip yeniden kurulur. Yeni sürümü yükledikten sonra gerekir.',
    label: 'Önbelleği yenile',
    done: 'Önbellek yenilendi',
  },
  'expire-runs': {
    title: 'Yarım kalan turlar kapatılsın mı?',
    description: 'Süresi dolmuş açık turlar “süresi doldu” olarak kapanır. Oyuncuların sonraki turları bunu zaten yapar; bu yalnızca listeyi temizler.',
    label: 'Yarım turları kapat',
    done: 'Yarım turlar kapandı',
  },
};

const INTEGRITY = { off: 'Kapalı', log: 'Yalnızca kayıt', enforce: 'Uygulanıyor' } as const;

/** What the API runs with, what waits to be done, and the chores a host without SSH needs — owners only. */
export function SystemPage() {
  const system = useSystem();
  const chore = useSystemAction();
  const [asking, setAsking] = useState<AdminSystemAction | null>(null);
  const [output, setOutput] = useState<{ action: AdminSystemAction; text: string; ok: boolean } | null>(null);

  if (system.isPending) {
    return (
      <Page title="Sistem">
        <Skeleton className="h-72 rounded-panel" />
      </Page>
    );
  }
  if (system.error || !system.data) {
    return (
      <Page title="Sistem">
        <Callout tone="bad" title="Veri alınamadı">
          {errorMessage(system.error)}
        </Callout>
      </Page>
    );
  }

  const data = system.data;
  const pending = data.pendingMigrations.length;
  const run = (action: AdminSystemAction) =>
    chore.mutate(action, {
      onSuccess: (result) => {
        setOutput({ action, text: result.output, ok: true });
        toast.success(CHORES[action].done);
        setAsking(null);
      },
      onError: (error) => {
        setOutput({ action, text: errorMessage(error), ok: false });
        toast.error(errorMessage(error));
        setAsking(null);
      },
    });

  return (
    <Page
      title="Sistem"
      description="API’nin çalıştığı ayarlar, bekleyen işler ve SSH olmayan hostlar için bakım. Hiçbir sır burada görünmez; yalnızca dolu olup olmadığı."
      eyebrow={<Tag tone="onBrand" icon={<Server />} label={data.environment} />}
      band={
        <BandStats
          stats={[
            { label: 'Sezon', value: formatNumber(data.season), icon: <Gamepad2 /> },
            { label: 'Cihaz doğrulaması', value: INTEGRITY[data.integrityMode] ?? data.integrityMode, icon: <ShieldCheck /> },
            { label: 'Bekleyen migration', value: formatNumber(pending), icon: <Database />, alert: pending > 0 },
            { label: 'Açık tur', value: formatNumber(data.runs.open), icon: <Hourglass />, alert: data.runs.stale > 0 },
          ]}
        />
      }
    >
      {!data.appKey ? (
        <Callout
          tone="bad"
          title="APP_KEY eksik"
          action={
            <Button size="sm" tone="primary" onClick={() => setAsking('optimize')}>
              Önbelleği yenile
            </Button>
          }
        >
          <p>
            Oyuncu istekleri 500 dönüyor: kontrol noktası makbuzları imzalanamıyor, Apple ile giriş yapılamıyor. Yerelde{' '}
            <code className="font-mono">php artisan key:generate --show</code> çıktısını sunucudaki .env dosyasına APP_KEY olarak yaz, sonra önbelleği
            yenile. Anahtar bir kez yazılır, bir daha değişmez.
          </p>
        </Callout>
      ) : null}
      {pending > 0 ? (
        <Callout
          tone="warn"
          title={`${formatNumber(pending)} migration bekliyor`}
          action={
            <Button size="sm" tone="primary" onClick={() => setAsking('migrate')}>
              Çalıştır
            </Button>
          }
        >
          <p className="font-mono text-micro">{data.pendingMigrations.join(', ')}</p>
        </Callout>
      ) : null}
      {data.tokens.ops || data.tokens.moderation ? (
        <Callout tone="warn" title="Paylaşılan bir anahtar açık">
          <p>
            {[data.tokens.ops ? 'OPS_TOKEN' : null, data.tokens.moderation ? 'MODERATION_TOKEN' : null].filter(Boolean).join(' ve ')} dolu. Kullanmıyorsan
            sunucudaki .env dosyasında boşalt; panel bu işleri anahtarsız yapıyor.
          </p>
        </Callout>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Sunucu" icon={<Server />} tone="secondary">
          <Facts
            facts={[
              { label: 'Ortam', value: data.environment },
              { label: 'PHP', value: data.php },
              { label: 'Laravel', value: data.laravel },
              { label: 'Veritabanı', value: data.database },
              { label: 'Saat dilimi', value: data.timezone },
              { label: 'Sunucu saati', value: formatDateTime(data.serverTime) },
              { label: 'APP_KEY', value: <Tag tone={data.appKey ? 'ok' : 'bad'} label={data.appKey ? 'Tanımlı' : 'Eksik'} /> },
              { label: 'Yapılandırma önbelleği', value: <Tag tone={data.cached.config ? 'ok' : 'neutral'} label={data.cached.config ? 'Açık' : 'Kapalı'} /> },
              { label: 'Rota önbelleği', value: <Tag tone={data.cached.routes ? 'ok' : 'neutral'} label={data.cached.routes ? 'Açık' : 'Kapalı'} /> },
            ]}
          />
        </Panel>

        <Panel title="Oyun" icon={<Gamepad2 />}>
          <Facts
            facts={[
              { label: 'Sezon · motor', value: `${data.season} · v${data.engineVersion}` },
              { label: 'İçerik kataloğu', value: `v${data.contentVersion}` },
              { label: 'Günün akışı başlangıcı', value: data.dailyEpoch },
              { label: 'Cihaz doğrulaması', value: INTEGRITY[data.integrityMode] ?? data.integrityMode },
              { label: 'iOS en düşük · en son', value: `${data.apps.ios.min} · ${data.apps.ios.latest}` },
              { label: 'Android en düşük · en son', value: `${data.apps.android.min} · ${data.apps.android.latest}` },
            ]}
          />
        </Panel>

        <Panel title="Sınırlar" icon={<Gauge />} tone="warn">
          <Facts
            facts={[
              { label: 'İncelemeye düşen zirve · sezon', value: `İlk ${formatNumber(data.limits.reviewTopAll)}` },
              { label: 'İncelemeye düşen zirve · hafta', value: `İlk ${formatNumber(data.limits.reviewTopWeekly)}` },
              { label: 'Lig grubu', value: `${formatNumber(data.limits.leagueGroupSize)} oyuncu` },
              { label: 'Lig açılışı', value: `${formatNumber(data.limits.leagueUnlockRuns)} sayılan tur` },
              { label: 'Tur süresi', value: `${formatNumber(data.limits.runTtlMinutes)} dk` },
              { label: 'Panel oturumu', value: `${formatNumber(data.limits.adminTokenHours)} saat` },
            ]}
          />
        </Panel>
      </div>

      <Panel title="Bakım" description="Yeni sürümü yükledikten sonra: önce migration’lar, sonra önbellek." icon={<Wrench />}>
        <div className="flex flex-wrap gap-2">
          <Button tone="neutral" icon={<Database />} onClick={() => setAsking('migrate')}>
            Migration’ları çalıştır
          </Button>
          <Button tone="neutral" icon={<RefreshCw />} onClick={() => setAsking('optimize')}>
            Önbelleği yenile
          </Button>
          <Button tone="neutral" icon={<Hourglass />} onClick={() => setAsking('expire-runs')}>
            Yarım turları kapat{data.runs.stale > 0 ? ` (${formatNumber(data.runs.stale)})` : ''}
          </Button>
        </div>
        {output ? (
          <div className="mt-4 space-y-2">
            <p className="flex items-center gap-2 text-micro text-ink-faint">
              <Terminal aria-hidden className="size-3.5" />
              Son çıktı · {CHORES[output.action].label}
              <Tag tone={output.ok ? 'ok' : 'bad'} label={output.ok ? 'Tamam' : 'Hata'} />
            </p>
            <pre className="max-h-72 overflow-auto rounded-control bg-sunken p-3 font-mono text-meta whitespace-pre-wrap text-ink">
              {output.text || 'Çıktı yok.'}
            </pre>
          </div>
        ) : null}
      </Panel>

      {asking ? (
        <ConfirmModal
          open
          onOpenChange={(open) => !open && setAsking(null)}
          tone={asking === 'migrate' ? 'danger' : 'primary'}
          icon={<Wrench />}
          title={CHORES[asking].title}
          description={CHORES[asking].description}
          confirmLabel={CHORES[asking].label}
          loading={chore.isPending}
          onConfirm={() => run(asking)}
        />
      ) : null}
    </Page>
  );
}
