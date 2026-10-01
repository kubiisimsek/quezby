import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/base/button';
import { formatNumber } from '@/lib/format';

type Counted = {
  /** Rows in every page together. */
  total: number;
};

type Uncounted = {
  /** A list too long to count (the logs): the rows on this page, and whether a next one is there. */
  count: number;
  hasMore: boolean;
};

/**
 * The foot of a paged list: which rows these are of how many, and the way to
 * the pages either side. The API pages every list; the panel never loads a
 * whole table. A list too long to count says only which rows these are and
 * whether more follow.
 */
export function Pager({
  page,
  perPage,
  onPage,
  noun = 'kayıt',
  ...size
}: {
  page: number;
  perPage: number;
  onPage: (page: number) => void;
  /** What is being counted: "1–25 / 1.234 oyuncu". */
  noun?: string;
} & (Counted | Uncounted)) {
  const counted = 'total' in size;
  const total = counted ? size.total : (page - 1) * perPage + size.count;
  const last = counted ? Math.max(1, Math.ceil(total / perPage)) : null;
  const hasNext = counted ? page < (last ?? 1) : size.hasMore;
  const from = total === 0 || (!counted && size.count === 0) ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  return (
    <nav aria-label="Sayfalar" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-meta text-ink-muted tabular">
        <span className="font-semibold text-ink">
          {formatNumber(from)}–{formatNumber(to)}
        </span>{' '}
        {counted ? `/ ${formatNumber(total)} ${noun}` : noun}
      </p>
      {page > 1 || hasNext ? (
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-micro text-ink-faint tabular">
            Sayfa {formatNumber(page)}
            {last !== null ? ` / ${formatNumber(last)}` : ''}
          </span>
          <Button tone="ghost" size="icon-sm" aria-label="Önceki sayfa" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft />
          </Button>
          <Button tone="ghost" size="icon-sm" aria-label="Sonraki sayfa" disabled={!hasNext} onClick={() => onPage(page + 1)}>
            <ChevronRight />
          </Button>
        </div>
      ) : null}
    </nav>
  );
}
