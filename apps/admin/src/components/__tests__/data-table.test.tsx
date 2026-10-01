import { screen, within } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/base/button';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { Pager } from '@/components/patterns/pager';
import { renderWithProviders } from '@/test/render';

type Row = { id: string; name: string; score: number };

const COLUMNS: Column<Row>[] = [
  { key: 'name', header: 'Oyuncu', cell: (row) => row.name, tone: 'strong' },
  { key: 'score', header: 'Skor', cell: (row) => row.score, align: 'end' },
];

const ROWS: Row[] = [
  { id: 'a', name: 'kerem.35', score: 250311 },
  { id: 'b', name: 'ekin', score: 39960 },
];

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

describe('DataTable', () => {
  it('draws a head and a row per record', () => {
    renderWithProviders(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(row) => row.id} empty={{ title: 'Boş' }} title="Oyuncular" />);

    expect(screen.getByRole('columnheader', { name: 'Oyuncu' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByRole('cell', { name: 'kerem.35' })).toBeInTheDocument();
  });

  it('shows skeleton rows while loading, and says it is busy', () => {
    renderWithProviders(<DataTable columns={COLUMNS} rows={[]} rowKey={(row) => row.id} isLoading empty={{ title: 'Boş' }} />);

    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByRole('row')).toHaveLength(6);
    expect(screen.queryByText('Boş')).not.toBeInTheDocument();
  });

  it('says what is missing when there are no rows', () => {
    renderWithProviders(
      <DataTable columns={COLUMNS} rows={[]} rowKey={(row) => row.id} empty={{ title: 'Henüz oyuncu yok', hint: 'İlk oyuncu gelince burada.' }} />,
    );

    expect(screen.getByText('Henüz oyuncu yok')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a failure in place of the rows', () => {
    renderWithProviders(<DataTable columns={COLUMNS} rows={[]} rowKey={(row) => row.id} error={new Error('x')} empty={{ title: 'Boş' }} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Veri alınamadı');
  });

  it('opens a record from anywhere on its row, but not from a control in it', async () => {
    const onClick = vi.fn();
    const { user } = renderWithProviders(
      <>
        <DataTable
          columns={COLUMNS}
          rows={ROWS}
          rowKey={(row) => row.id}
          empty={{ title: 'Boş' }}
          rowTo={(row) => `/players/${row.id}`}
          rowLabel={(row) => `${row.name} aç`}
          rowActions={() => <Button onClick={onClick}>Yasakla</Button>}
        />
        <Where />
      </>,
    );

    await user.click(screen.getAllByRole('button', { name: 'Yasakla' })[0] as HTMLElement);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('where')).toHaveTextContent('/');

    await user.click(screen.getByRole('cell', { name: 'ekin' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/players/b');
    expect(screen.getByRole('link', { name: 'kerem.35 aç' })).toHaveAttribute('href', '/players/a');
  });

  it('carries a pager at its foot', () => {
    renderWithProviders(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(row) => row.id}
        empty={{ title: 'Boş' }}
        footer={<Pager page={1} perPage={2} total={3} onPage={() => {}} noun="oyuncu" />}
      />,
    );

    expect(within(screen.getByRole('navigation', { name: 'Sayfalar' })).getByText(/oyuncu/)).toBeInTheDocument();
  });
});

describe('Pager', () => {
  it('pages a list too long to count by whether more follow', async () => {
    const onPage = vi.fn();
    const { user, unmount } = renderWithProviders(<Pager page={2} perPage={25} count={25} hasMore onPage={onPage} noun="log" />);

    expect(screen.getByText('26–50')).toBeInTheDocument();
    expect(screen.getByText(/^\s*log$/)).toBeInTheDocument();
    expect(screen.getByText('Sayfa 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sonraki sayfa' }));
    expect(onPage).toHaveBeenLastCalledWith(3);

    unmount();
    renderWithProviders(<Pager page={3} perPage={25} count={7} hasMore={false} onPage={onPage} noun="log" />);
    expect(screen.getByText('51–57')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sonraki sayfa' })).toBeDisabled();
  });

  it('says which rows these are and moves between pages', async () => {
    const onPage = vi.fn();
    const { user } = renderWithProviders(<Pager page={2} perPage={25} total={1234} onPage={onPage} noun="oyuncu" />);

    expect(screen.getByText('26–50')).toBeInTheDocument();
    expect(screen.getByText(/1\.234 oyuncu/)).toBeInTheDocument();
    expect(screen.getByText('Sayfa 2 / 50')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Önceki sayfa' }));
    await user.click(screen.getByRole('button', { name: 'Sonraki sayfa' }));
    expect(onPage.mock.calls).toEqual([[1], [3]]);
  });

  it('cannot go past either end, and hides its buttons on a single page', () => {
    const { rerender } = renderWithProviders(<Pager page={50} perPage={25} total={1234} onPage={() => {}} />);
    expect(screen.getByRole('button', { name: 'Sonraki sayfa' })).toBeDisabled();

    rerender(<Pager page={1} perPage={25} total={3} onPage={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Sonraki sayfa' })).not.toBeInTheDocument();
    expect(screen.getByText('1–3')).toBeInTheDocument();
  });
});
