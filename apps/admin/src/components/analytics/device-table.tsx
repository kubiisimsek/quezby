import type { AdminDeviceRow, AdminDeviceTable } from '@quezby/types';
import { useId, type ReactNode } from 'react';

import { Meter } from '@/components/base/meter';
import { formatNumber, formatPerMille } from '@/lib/format';

/**
 * One table of phones inside the Cihazlar card — a system's versions, a
 * maker's models, the other makers. Its heading says how many phones it holds
 * and their share of every phone; each row its phones and its share of the
 * table, both the API's; under a row's name, the app versions those phones
 * run. The bar shows only where the table has room for it; the phones of the
 * rows left out, and a note when there is one, go under it.
 */
export function DeviceTable({
  title,
  note,
  header,
  table,
  name,
}: {
  title: string;
  /** A line under the table, for one that needs a word of explanation. */
  note?: ReactNode;
  /** What a row is: a system's version, a model, a maker. */
  header: string;
  table: AdminDeviceTable;
  /** A row in words — its `value` is null when the phones never said. */
  name: (row: AdminDeviceRow) => string;
}) {
  const heading = useId();

  return (
    <section aria-labelledby={heading} className="@container min-w-0">
      <header className="flex items-baseline justify-between gap-3 pb-2">
        <h3 id={heading} className="min-w-0 truncate text-body font-semibold text-ink">
          {title}
        </h3>
        <p className="shrink-0 text-meta text-ink-muted tabular">
          {formatNumber(table.devices)} telefon · {formatPerMille(table.share)}
        </p>
      </header>
      <table className="w-full border-separate border-spacing-0 text-body [&_tbody_tr:last-child>*]:border-b-0">
        <caption className="sr-only">{title}</caption>
        <thead>
          <tr className="text-micro text-ink-faint">
            <th scope="col" className="border-b border-line-soft py-2 pr-3 text-start font-semibold">
              {header}
            </th>
            <th scope="col" className="border-b border-line-soft px-3 py-2 text-end font-semibold">
              Telefon
            </th>
            <th scope="col" className="border-b border-line-soft py-2 pl-3 text-end font-semibold">
              Pay
            </th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            <tr key={row.value ?? '—'}>
              <th scope="row" className="border-b border-line-soft py-2.5 pr-3 text-start align-middle font-normal">
                <span className="block max-w-64 truncate font-semibold text-ink" title={name(row)}>
                  {name(row)}
                </span>
                <AppVersions row={row} />
              </th>
              <td className="border-b border-line-soft px-3 py-2.5 text-end align-middle text-ink-muted tabular">
                {formatNumber(row.devices)}
              </td>
              <td className="border-b border-line-soft py-2.5 pl-3 align-middle">
                <span className="flex items-center justify-end gap-3">
                  <Meter value={row.share / 1000} tone="secondary" label={`${name(row)} payı`} index={index} className="hidden w-20 @sm:block" />
                  <span className="text-ink-muted tabular">{formatPerMille(row.share)}</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {table.rest > 0 ? (
        <p className="pt-2 text-meta text-ink-muted">Listede olmayanlar: {formatNumber(table.rest)} telefon</p>
      ) : null}
      {note ? <p className="pt-2 text-meta text-ink-muted">{note}</p> : null}
    </section>
  );
}

/**
 * The app versions on a row's phones, under its name:
 * `Uygulama 1.0.2 (40) · 1.0.1 (3) · diğer (2)` — a narrow cell wraps between
 * versions, never inside one.
 */
function AppVersions({ row }: { row: AdminDeviceRow }) {
  const versions = row.versions.map((version) => `${version.version ?? 'bilinmiyor'} (${formatNumber(version.devices)})`);
  if (row.otherVersions > 0) versions.push(`diğer (${formatNumber(row.otherVersions)})`);

  return (
    <span className="block text-micro font-medium text-ink-muted tabular">
      <span className="text-ink-faint">Uygulama</span>
      {versions.map((version, index) => (
        <span key={version}>
          {index > 0 ? ' · ' : ' '}
          <span className="whitespace-nowrap">{version}</span>
        </span>
      ))}
    </span>
  );
}
