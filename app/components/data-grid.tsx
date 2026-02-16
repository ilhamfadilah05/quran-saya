'use client';

import { ReactNode, useMemo, useState } from 'react';

type GridValue = unknown;

export type DataGridColumn = {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  searchable?: boolean;
  render?: (row: Record<string, GridValue>) => ReactNode;
};

type DataGridProps = {
  title?: string;
  rows: Array<Record<string, GridValue>>;
  columns: DataGridColumn[];
  rowKey: string;
  emptyMessage?: string;
  headerActions?: ReactNode;
};

function toneClass(value: string) {
  const lowered = value.toLowerCase();
  if (['sent', 'success', 'aktif', 'active'].includes(lowered)) return 'ok';
  if (['failed', 'error'].includes(lowered)) return 'bad';
  if (['partial', 'queued', 'pending'].includes(lowered)) return 'warn';
  return 'unknown';
}

function formatValue(value: GridValue) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function DataGrid({
  title,
  rows,
  columns,
  rowKey,
  emptyMessage = 'Belum ada data.',
  headerActions
}: DataGridProps) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;

    return rows.filter((row) =>
      columns.some((column) => {
        if (column.searchable === false) return false;
        const value = row[column.key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(normalized);
      })
    );
  }, [rows, columns, query]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pagedRows = filteredRows.slice(start, start + pageSize);

  function onPageSizeChange(next: number) {
    setPageSize(next);
    setPage(1);
  }

  return (
    <section className="card grid" style={{ gap: 12 }}>
      {title && <h2>{title}</h2>}

      <div className="grid-toolbar">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Cari data..."
          aria-label="Cari data"
        />
        <div className="grid-toolbar-right">
          {headerActions}
          <div className="grid-page-size">
            <label htmlFor="page-size">Rows</label>
            <select id="page-size" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {filteredRows.length === 0 && <p className="small">{emptyMessage}</p>}

      {filteredRows.length > 0 && (
        <>
          <div className="table-wrap grid-table-wrap">
            <table className="grid-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} style={{ textAlign: column.align ?? 'left' }}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row, index) => (
                  <tr key={`${String(row[rowKey])}-${index}`}>
                    {columns.map((column) => {
                      const rendered = column.render?.(row);
                      const cell = formatValue(row[column.key]);
                      const isStatus = column.key.toLowerCase().includes('status');
                      return (
                        <td key={column.key} style={{ textAlign: column.align ?? 'left' }}>
                          {rendered ?? (isStatus ? <span className={`status-pill ${toneClass(cell)}`}>{cell}</span> : cell)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid-pagination">
            <p className="small">
              Menampilkan {filteredRows.length === 0 ? 0 : start + 1}-{Math.min(start + pageSize, filteredRows.length)} dari {filteredRows.length}
            </p>
            <div className="grid-pagination-actions">
              <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                Prev
              </button>
              <span className="small">
                Page {currentPage}/{totalPages}
              </span>
              <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
