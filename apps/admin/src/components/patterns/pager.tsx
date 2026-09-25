import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/base/button';
import { formatNumber } from '@/lib/format';

/**
 * The foot of a paged list: which rows these are of how many, and the way to
 * the pages either side. The API pages every list; the panel never loads a
 * whole table.
 */
export function Pager({
  page,
  perPage,
  total,
  onPage,
  noun = 'kayıt',
}: {
  page: number;
  perPage: number;
  total: number;
  onPage: (page: number) => void;
  /** What is being counted: "1–25 / 1.234 oyuncu". */
  noun?: string;
}) {
  const last = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  return (
    <nav aria-label="Sayfalar" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-meta text-ink-muted tabular">
        <span className="font-semibold text-ink">
          {formatNumber(from)}–{formatNumber(to)}
        </span>{' '}
        / {formatNumber(total)} {noun}
      </p>
      {last > 1 ? (
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-micro text-ink-faint tabular">
            Sayfa {formatNumber(page)} / {formatNumber(last)}
          </span>
          <Button tone="ghost" size="icon-sm" aria-label="Önceki sayfa" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft />
          </Button>
          <Button tone="ghost" size="icon-sm" aria-label="Sonraki sayfa" disabled={page >= last} onClick={() => onPage(page + 1)}>
            <ChevronRight />
          </Button>
        </div>
      ) : null}
    </nav>
  );
}
