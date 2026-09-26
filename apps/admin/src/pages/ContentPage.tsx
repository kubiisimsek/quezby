import { postsOf, type Post } from '@quezby/config';
import type { AdminContentRow, AdminContentSort, AdminPostKind } from '@quezby/types';
import { Eye, GalleryVerticalEnd, Heart, TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';

import { Meter } from '@/components/base/meter';
import { Panel } from '@/components/base/panel';
import { Picker } from '@/components/base/picker';
import { Tag } from '@/components/base/tag';
import { BandStats } from '@/components/patterns/band-stats';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { FilterChips } from '@/components/patterns/filter-chips';
import { Page } from '@/components/patterns/page';
import { ShareList } from '@/components/patterns/share-list';
import { useContent } from '@/hooks/api/content';
import { useListParams } from '@/hooks/useListParams';
import { formatNumber, formatPerMille, POST_KIND } from '@/lib/format';

type KindChip = 'all' | AdminPostKind;

/** What a post says, in Turkish: the panel's language and the catalog's source — players read their own. */
function wordsOf(post: Post | undefined): string | undefined {
  return post?.headline?.tr ?? post?.caption.tr;
}

/** A post as the feed shows it: its emoji, who posted it and what it says. */
function PostCell({ post, id }: { post: Post | undefined; id: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-control bg-tint-wash text-title">
        {post?.emoji ?? '·'}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-ink">{wordsOf(post) ?? id}</span>
        <span className="block truncate text-micro font-medium text-ink-faint">
          {post ? `${post.user.tr} · ` : ''}
          <span className="font-mono">{id}</span>
        </span>
      </span>
    </span>
  );
}

function rate(value: number | null, tone: 'ok' | 'bad', label: string) {
  if (value === null) return <span className="text-ink-faint">Gösterilmedi</span>;
  return (
    <span className="flex min-w-32 items-center gap-2">
      <Meter value={value / 1000} tone={tone} label={label} className="flex-1" />
      <span className="w-12 text-end text-meta font-semibold text-ink tabular">{formatPerMille(value)}</span>
    </span>
  );
}

/**
 * How the feed's posts fare: how often each is shown, liked and missed — for
 * balancing the catalog. Labels come from the catalog the app plays with.
 */
export function ContentPage() {
  const { params, set } = useListParams({ kind: 'all', sort: 'shows' });
  const kind = params.kind as KindChip;
  const content = useContent({ kind: kind === 'all' ? undefined : kind, sort: params.sort as AdminContentSort });
  const data = content.data;
  const posts = useMemo(() => {
    try {
      return postsOf(data?.contentVersion);
    } catch {
      return new Map<string, Post>();
    }
  }, [data?.contentVersion]);

  const columns: Column<AdminContentRow>[] = [
    { key: 'post', header: 'Post', cell: (row) => <PostCell post={posts.get(row.contentId)} id={row.contentId} /> },
    { key: 'kind', header: 'Tür', cell: (row) => <Tag tone="secondary" dot={false} label={POST_KIND[row.kind].label} />, hideBelow: 'md' },
    { key: 'shows', header: 'Gösterim', cell: (row) => formatNumber(row.shows), align: 'end', tone: 'strong' },
    { key: 'likeRate', header: 'Beğeni', cell: (row) => rate(row.likeRate, 'ok', 'Beğeni oranı'), hideBelow: 'xl' },
    { key: 'missRate', header: 'Kaçırma', cell: (row) => rate(row.missRate, 'bad', 'Kaçırma oranı') },
  ];

  const label = (row: AdminContentRow) => {
    const post = posts.get(row.contentId);
    return `${post?.emoji ?? ''} ${wordsOf(post) ?? row.contentId}`.trim();
  };
  // The five highest rates the API sent, among posts it happened to at all.
  const topBy = (rate: 'likeRate' | 'missRate', count: 'likes' | 'misses') =>
    [...(data?.items ?? [])]
      .filter((row) => row[rate] !== null && row[count] > 0)
      .sort((a, b) => (b[rate] ?? 0) - (a[rate] ?? 0))
      .slice(0, 5);
  const missed = topBy('missRate', 'misses');
  const liked = topBy('likeRate', 'likes');

  return (
    <Page
      title="İçerik"
      description="Akıştaki her post oyunculara nasıl geliyor: kaç kez gösterildi, ne kadar beğenildi, ne kadar kaçırıldı. Dengeyi ayarlamak için."
      band={
        <BandStats
          stats={[
            { label: 'Gösterim', value: data ? formatNumber(data.totals.shows) : '…', icon: <Eye /> },
            { label: 'Beğeni', value: data ? formatNumber(data.totals.likes) : '…', icon: <Heart /> },
            { label: 'Kaçırma', value: data ? formatNumber(data.totals.misses) : '…', icon: <TriangleAlert /> },
            { label: 'Katalog', value: data ? `v${data.contentVersion}` : '…', icon: <GalleryVerticalEnd /> },
          ]}
        />
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <DataTable
          title="Postlar"
          description="Oranlar gösterimin yüzdesi."
          icon={<GalleryVerticalEnd />}
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(row) => row.contentId}
          isLoading={content.isPending}
          isFetching={content.isFetching}
          error={content.error}
          toolbar={
            <>
              <FilterChips<KindChip>
                aria-label="Tür"
                value={kind}
                onChange={(value) => set({ kind: value })}
                chips={[{ value: 'all', label: 'Tümü' }, ...(Object.keys(POST_KIND) as AdminPostKind[]).map((value) => ({ value, label: POST_KIND[value].label }))]}
              />
              <div className="sm:ml-auto">
                <Picker<AdminContentSort>
                  compact
                  aria-label="Sıralama"
                  value={params.sort as AdminContentSort}
                  onChange={(value) => set({ sort: value })}
                  options={[
                    { value: 'shows', label: 'En çok gösterilen' },
                    { value: 'likeRate', label: 'En çok beğenilen' },
                    { value: 'missRate', label: 'En çok kaçırılan' },
                  ]}
                />
              </div>
            </>
          }
          empty={{ title: 'Katalogda post yok', icon: <GalleryVerticalEnd /> }}
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-1 xl:self-start">
          <Panel title="En çok kaçırılanlar" description="Oyuncuların en çok takıldığı postlar." icon={<TriangleAlert />} tone="bad">
            {missed.length > 0 ? (
              <ShareList
                label="En çok kaçırılan postlar"
                items={missed.map((row) => ({ key: row.contentId, label: label(row), hint: formatPerMille(row.missRate), count: row.misses, tone: 'bad' }))}
              />
            ) : (
              <p className="text-meta text-ink-muted">Henüz kaçırılan post yok.</p>
            )}
          </Panel>
          <Panel title="En çok beğenilenler" description="Oyuncuların en çok beğendiği postlar." icon={<Heart />} tone="ok">
            {liked.length > 0 ? (
              <ShareList
                label="En çok beğenilen postlar"
                items={liked.map((row) => ({ key: row.contentId, label: label(row), hint: formatPerMille(row.likeRate), count: row.likes, tone: 'ok' }))}
              />
            ) : (
              <p className="text-meta text-ink-muted">Henüz beğenilen post yok.</p>
            )}
          </Panel>
        </div>
      </div>
    </Page>
  );
}
