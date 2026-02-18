'use client';

import { ReactNode, useMemo, useState } from 'react';
import { Input as RizzInput } from 'rizzui';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';

type GridValue = unknown;
type SortDirection = 'asc' | 'desc';

export type DataGridColumn = {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  searchable?: boolean;
  sortable?: boolean;
  render?: (row: Record<string, GridValue>) => ReactNode;
};

type DataGridProps = {
  title?: string;
  rows: Array<Record<string, GridValue>>;
  columns: DataGridColumn[];
  rowKey: string;
  emptyMessage?: string;
  headerActions?: ReactNode;
  defaultSort?: {
    key: string;
    direction?: SortDirection;
  };
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
  headerActions,
  defaultSort
}: DataGridProps) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<string | null>(defaultSort?.key ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSort?.direction ?? 'asc');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const hasQuery = normalized.length > 0;

    return rows.filter((row) => {
      const passGlobal = !hasQuery
        ? true
        : columns.some((column) => {
            if (column.searchable === false) return false;
            const value = row[column.key];
            if (value === null || value === undefined) return false;
            return String(value).toLowerCase().includes(normalized);
          });

      if (!passGlobal) return false;

      return columns.every((column) => {
        const filterValue = (columnFilters[column.key] ?? '').trim().toLowerCase();
        if (!filterValue || column.searchable === false) return true;
        const value = row[column.key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(filterValue);
      });
    });
  }, [rows, columns, query, columnFilters]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;

    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      const an = Number(av);
      const bn = Number(bv);
      let result = 0;

      if (!Number.isNaN(an) && !Number.isNaN(bn)) {
        result = an - bn;
      } else {
        result = String(av).localeCompare(String(bv), 'id', { sensitivity: 'base', numeric: true });
      }

      return sortDirection === 'asc' ? result : -result;
    });

    return sorted;
  }, [filteredRows, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pagedRows = sortedRows.slice(start, start + pageSize);

  function onPageSizeChange(next: number) {
    setPageSize(next);
    setPage(1);
  }

  function onSort(column: DataGridColumn) {
    if (column.sortable === false) return;

    if (sortKey === column.key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(column.key);
      setSortDirection('asc');
    }
    setPage(1);
  }

  return (
    <section className="ui-card grid" style={{ gap: 12 }}>
      {title && <h2>{title}</h2>}

      <div className="grid-toolbar">
        <RizzInput
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Cari data..."
          aria-label="Cari data"
          className="rz-input"
          inputClassName="rz-input-control"
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

      <div className="table-wrap grid-table-wrap">
        <Table className="grid-table">
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} style={{ textAlign: column.align ?? 'left' }}>
                  {column.sortable === false ? (
                    column.label
                  ) : (
                    <button type="button" className="grid-sort-btn" onClick={() => onSort(column)}>
                      <span>{column.label}</span>
                      {sortKey === column.key && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                  )}
                </TableHead>
              ))}
            </TableRow>
            <TableRow className="grid-filter-row">
              {columns.map((column) => (
                <TableHead key={`${column.key}-filter`}>
                  {column.searchable === false ? null : (
                    <input
                      className="grid-column-filter"
                      value={columnFilters[column.key] ?? ''}
                      onChange={(event) => {
                        setColumnFilters((prev) => ({ ...prev, [column.key]: event.target.value }));
                        setPage(1);
                      }}
                      placeholder={`Filter ${column.label}`}
                      aria-label={`Filter ${column.label}`}
                    />
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} style={{ textAlign: 'center' }}>
                  <p className="small">{emptyMessage}</p>
                </TableCell>
              </TableRow>
            )}
            {pagedRows.map((row, index) => (
              <TableRow key={`${String(row[rowKey])}-${index}`}>
                {columns.map((column) => {
                  const rendered = column.render?.(row);
                  const cell = formatValue(row[column.key]);
                  const isStatus = column.key.toLowerCase().includes('status');
                  return (
                    <TableCell key={column.key} style={{ textAlign: column.align ?? 'left' }}>
                      {rendered ?? (isStatus ? <Badge variant={toneClass(cell) === 'ok' ? 'success' : toneClass(cell) === 'bad' ? 'destructive' : toneClass(cell) === 'warn' ? 'warning' : 'outline'}>{cell}</Badge> : cell)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid-pagination">
        <p className="small">
          Menampilkan {sortedRows.length === 0 ? 0 : start + 1}-{Math.min(start + pageSize, sortedRows.length)} dari {sortedRows.length}
        </p>
        <div className="grid-pagination-actions">
          <Button type="button" variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1 || sortedRows.length === 0}>
            Prev
          </Button>
          <span className="small">
            Page {sortedRows.length === 0 ? 0 : currentPage}/{sortedRows.length === 0 ? 0 : totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || sortedRows.length === 0}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}
