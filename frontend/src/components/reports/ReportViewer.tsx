import { useState, useMemo, useCallback } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, ChevronDown, Download, RefreshCw, Filter, ArrowUpDown, Printer,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { formatINR, formatDate, formatQty } from '@/lib/format';
import { LABELS } from '@/constants/labels';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/EmptyState';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportColumn {
  fieldname: string;
  label: string;
  fieldtype?: string;
  options?: string;
  width?: number;
  link_doctype?: string;
}

export interface ReportRow {
  indent?: number;
  is_group?: number;
  bold?: number;
  has_value?: boolean;
  [key: string]: unknown;
}

export interface ReportResult {
  result: ReportRow[];
  columns: ReportColumn[];
  chart?: unknown;
  report_summary?: Array<{ label: string; value: string | number; indicator?: string }>;
  total_row?: ReportRow;
  message?: string;
}

export type FilterValue = string | number | boolean | null;
export type ReportFilters = Record<string, FilterValue>;

// ─── Doctype slug map for in-portal links ──────────────────────────────────

const DOCTYPE_ROUTES: Record<string, string> = {
  'Stock Entry': 'stock-entries',
  'Work Order': 'work-orders',
  'Sales Invoice': 'sales-invoices',
  'Delivery Note': 'delivery-notes',
  'Payment Entry': 'payments',
  'Sales Order': 'sales-orders',
  'Purchase Invoice': 'purchase-invoices',
  'Purchase Receipt': 'purchase-receipts',
  'Journal Entry': 'journal-entries',
};

// ─── Cell renderer ────────────────────────────────────────────────────────────

interface CellProps {
  value: unknown;
  col: ReportColumn;
  onDrillDown?: (row: ReportRow, col: ReportColumn) => void;
  row: ReportRow;
}

function Cell({ value, col, onDrillDown, row }: CellProps) {
  const navigate = useNavigate();
  const ft = col.fieldtype ?? 'Data';

  if (value === null || value === undefined || value === '') return <span className="text-muted">—</span>;

  if (ft === 'Currency' || ft === 'Float') {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    const formatted = ft === 'Currency' ? formatINR(num) : formatQty(num, 2);
    const isProfitRow = String(row.account_name ?? '').toLowerCase().includes('profit') || !!row.warn_if_negative;
    let textColor = 'var(--text)';
    let isBold = false;
    if (num < 0) {
      textColor = 'var(--red-600)';
      isBold = true;
    } else if (isProfitRow && num > 0) {
      textColor = 'var(--success-text)';
      isBold = true;
    }
    return (
      <span
        className={`font-mono text-xs ${isBold ? 'font-bold' : ''} ${onDrillDown ? 'underline decoration-dotted cursor-pointer hover:opacity-75' : ''}`}
        style={{ color: textColor }}
        onClick={onDrillDown ? () => onDrillDown(row, col) : undefined}
      >
        {formatted}
      </span>
    );
  }

  if (ft === 'Date' || ft === 'Datetime') {
    return <span className="text-sm" style={{ color: 'var(--table-date)' }}>{formatDate(String(value))}</span>;
  }

  if (ft === 'Link' && col.options) {
    const route = DOCTYPE_ROUTES[col.options];
    const strVal = String(value);
    if (route) {
      return (
        <button
          onClick={() => navigate(`/${route}/${encodeURIComponent(strVal)}`)}
          className="text-sm font-mono underline decoration-dotted hover:opacity-75"
          style={{ color: 'var(--primary)' }}
        >
          {strVal}
        </button>
      );
    }
  }

  if (ft === 'Percent') {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    return <span className="text-sm font-mono">{isNaN(num) ? String(value) : `${num.toFixed(2)}%`}</span>;
  }

  return <span className="text-sm text-fg">{String(value)}</span>;
}

// ─── Expandable tree row ───────────────────────────────────────────────────────

interface TreeRowProps {
  row: ReportRow;
  columns: ReportColumn[];
  isExpanded: boolean;
  onToggle: () => void;
  hasChildren: boolean;
  onDrillDown?: (row: ReportRow, col: ReportColumn) => void;
}

function TreeRow({ row, columns, isExpanded, onToggle, hasChildren, onDrillDown }: TreeRowProps) {
  const indent = (row.indent ?? 0) as number;
  const isGroup = !!(row.is_group || row.bold);

  return (
    <tr
      className="table-row-hover border-b"
      style={{ borderColor: 'var(--divider)', background: isGroup ? 'var(--bg-card2)' : undefined }}
    >
      {columns.map((col, ci) => {
        const value = row[col.fieldname];
        return (
          <td
            key={col.fieldname}
            className={`px-3 py-2.5 text-sm ${ci === 0 ? '' : 'text-right'}`}
          >
            {ci === 0 ? (
              <div className="flex items-center" style={{ paddingLeft: `${indent * 16}px` }}>
                {hasChildren ? (
                  <button onClick={onToggle} className="mr-1.5 text-muted hover:text-fg flex-shrink-0">
                    {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </button>
                ) : (
                  <span className="w-4 mr-1.5 flex-shrink-0" />
                )}
                <span className={isGroup ? 'font-semibold text-fg' : 'text-fg'}>
                  {String(value ?? '')}
                </span>
              </div>
            ) : (
              <Cell value={value} col={col} onDrillDown={onDrillDown} row={row} />
            )}
          </td>
        );
      })}
    </tr>
  );
}

// ─── Report Summary strip ─────────────────────────────────────────────────────

function ReportSummary({ summary }: { summary: ReportResult['report_summary'] }) {
  if (!summary?.length) return null;
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {summary.map((item, i) => (
        <div key={i} className="card-inner px-4 py-3 flex-1 min-w-[140px]">
          <p className="text-[10px] text-muted uppercase tracking-wide mb-0.5">{item.label}</p>
          <p
            className="text-lg font-bold"
            style={{
              color: item.indicator === 'Red' ? 'var(--red-600)' : item.indicator === 'Green' ? 'var(--success-text)' : 'var(--text)',
            }}
          >
            {String(item.value)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Export CSV ──────────────────────────────────────────────────────────────

function exportCsv(columns: ReportColumn[], rows: ReportRow[], filename: string) {
  const header = columns.map((c) => `"${c.label}"`).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => {
      const v = row[c.fieldname];
      return v === null || v === undefined ? '' : `"${String(v).replace(/"/g, '""')}"`;
    }).join(','),
  );
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface ERPNextChart {
  data?: {
    labels?: string[];
    datasets?: Array<{ name: string; values: number[] }>;
  };
  type?: string;
}

function ReportChart({ chart }: { chart: unknown }) {
  if (!chart || typeof chart !== 'object') return null;
  const c = chart as ERPNextChart;
  const labels = c.data?.labels ?? [];
  const datasets = c.data?.datasets ?? [];
  if (!labels.length || !datasets.length) return null;

  const chartData = labels.map((lbl, idx) => {
    const row: Record<string, string | number> = { label: lbl };
    datasets.forEach((ds) => {
      row[ds.name] = ds.values[idx] ?? 0;
    });
    return row;
  });

  const colors = ['var(--navy-600)', 'var(--red-600)', 'var(--navy-400)', 'var(--red-300)', 'var(--success-text)', 'var(--warning-text)'];

  return (
    <div className="card p-4 mb-4">
      <h3 className="text-xs font-semibold text-fg uppercase tracking-wider mb-3">Chart</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
            <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}
              formatter={(v: unknown) => formatINR(Number(v))}
            />
            <Legend />
            {datasets.map((ds, i) => (
              <Bar key={ds.name} dataKey={ds.name} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Main ReportViewer ────────────────────────────────────────────────────────

export interface ReportViewerProps {
  reportName: string;
  filters: ReportFilters;
  /** Called when a Currency cell in the first column section is clicked */
  onDrillDown?: (row: ReportRow, col: ReportColumn, filters: ReportFilters) => void;
  title?: string;
  /** If true, treat rows as a tree (use indent field) */
  tree?: boolean;
  swrKey?: string;
}

export function ReportViewer({
  reportName,
  filters,
  onDrillDown,
  title,
  tree = false,
  swrKey,
}: ReportViewerProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [expandAll, setExpandAll] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const key = swrKey ?? `report-${reportName}-${JSON.stringify(filters)}-${refreshCount}`;

  const { data, isLoading, error, mutate } = useFrappeGetCall<ReportResult>(
    'frappe.desk.query_report.run',
    { report_name: reportName, filters: JSON.stringify(filters) },
    key,
    {
      onSuccess: () => setLastRun(new Date()),
      revalidateOnFocus: false,
    },
  );

  const handleRefresh = useCallback(() => {
    setRefreshCount((c) => c + 1);
    mutate();
  }, [mutate]);

  // Build visible rows (tree filtering)
  const { columns, rows } = useMemo(() => {
    const raw = data?.result ?? [];
    const cols = (data?.columns ?? []) as ReportColumn[];

    if (!tree || !raw.length) return { columns: cols, rows: raw };

    // Determine which groups are expanded
    const visible: ReportRow[] = [];
    const groupStack: Array<{ indent: number; idx: number }> = [];

    for (let i = 0; i < raw.length; i++) {
      const row = raw[i];
      const indent = (row.indent ?? 0) as number;
      const isGrp = !!(row.is_group || row.bold);

      // Pop deeper stacks
      while (groupStack.length > 0 && groupStack[groupStack.length - 1].indent >= indent) {
        groupStack.pop();
      }

      // Check if parent is expanded (or root level)
      const parentExpanded = groupStack.length === 0 ||
        expanded.has(groupStack[groupStack.length - 1].idx) ||
        expandAll;

      if (!parentExpanded) continue;

      visible.push(row);
      if (isGrp) groupStack.push({ indent, idx: i });
    }

    return { columns: cols, rows: visible };
  }, [data, tree, expanded, expandAll]);

  // Sort non-tree tables
  const sortedRows = useMemo(() => {
    if (tree || !sortCol) return rows;
    return [...rows].sort((a, b) => {
      const va = a[sortCol]; const vb = b[sortCol];
      const na = typeof va === 'number' ? va : parseFloat(String(va ?? 0));
      const nb = typeof vb === 'number' ? vb : parseFloat(String(vb ?? 0));
      return sortDir === 'asc' ? na - nb : nb - na;
    });
  }, [rows, sortCol, sortDir, tree]);

  const toggleSort = (fieldname: string) => {
    if (sortCol === fieldname) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(fieldname); setSortDir('asc'); }
  };

  const hasChildren = useCallback((idx: number): boolean => {
    const raw = data?.result ?? [];
    const row = raw[idx];
    const indent = (row?.indent ?? 0) as number;
    const nextRow = raw[idx + 1];
    if (!nextRow) return false;
    return ((nextRow.indent ?? 0) as number) > indent;
  }, [data]);

  const toggleExpand = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const handleDrillDown = onDrillDown
    ? (row: ReportRow, col: ReportColumn) => onDrillDown(row, col, filters)
    : undefined;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {title && <h2 className="text-base font-semibold text-fg flex-1">{title}</h2>}
        {lastRun && (
          <span className="text-[10px] text-muted">
            {LABELS.reportLabels.lastRun}: {lastRun.toLocaleTimeString()}
          </span>
        )}
        {tree && (
          <>
            <button onClick={() => setExpandAll(true)} className="btn-ghost text-xs px-3 py-1.5">
              {LABELS.reportLabels.expandAll}
            </button>
            <button onClick={() => { setExpandAll(false); setExpanded(new Set()); }} className="btn-ghost text-xs px-3 py-1.5">
              {LABELS.reportLabels.collapseAll}
            </button>
          </>
        )}
        <button
          onClick={() => columns.length && exportCsv(columns, sortedRows, reportName)}
          className="btn-ghost text-xs px-3 py-1.5"
        >
          <Download size={13} />
          {LABELS.reportLabels.exportCsv}
        </button>
        <button
          onClick={() => window.print()}
          className="btn-ghost text-xs px-3 py-1.5"
        >
          <Printer size={13} />
          {LABELS.reportLabels.print}
        </button>
        <button onClick={handleRefresh} className="btn-ghost text-xs px-3 py-1.5" disabled={isLoading}>
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          {LABELS.reportLabels.refresh}
        </button>
      </div>

      {/* Summary strip */}
      <ReportSummary summary={data?.report_summary} />

      {/* Recharts chart if returned by ERPNext query report */}
      {data?.chart ? <ReportChart chart={data.chart} /> : null}

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={String(error)} onRetry={handleRefresh} />
        ) : !columns.length || !sortedRows.length ? (
          <EmptyState message={LABELS.reportLabels.noData} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card2)' }}>
                  {columns.map((col) => (
                    <th
                      key={col.fieldname}
                      className={`px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap ${col.fieldtype === 'Currency' || col.fieldtype === 'Float' || col.fieldtype === 'Percent' ? 'text-right' : 'text-left'}`}
                    >
                      {!tree && col.fieldtype && ['Currency', 'Float'].includes(col.fieldtype) ? (
                        <button onClick={() => toggleSort(col.fieldname)} className="flex items-center gap-1 ml-auto">
                          {col.label}
                          <ArrowUpDown size={10} className="text-muted" />
                        </button>
                      ) : col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tree ? (
                  sortedRows.map((row, i) => {
                    const rawIdx = (data?.result ?? []).indexOf(row);
                    return (
                      <TreeRow
                        key={i}
                        row={row}
                        columns={columns}
                        isExpanded={expanded.has(rawIdx) || expandAll}
                        onToggle={() => toggleExpand(rawIdx)}
                        hasChildren={hasChildren(rawIdx)}
                        onDrillDown={handleDrillDown}
                      />
                    );
                  })
                ) : (
                  sortedRows.map((row, i) => (
                    <tr
                      key={i}
                      className="table-row-hover border-b"
                      style={{ borderColor: 'var(--divider)' }}
                    >
                      {columns.map((col, ci) => (
                        <td
                          key={col.fieldname}
                          className={`px-3 py-2.5 ${ci > 0 && ['Currency', 'Float', 'Percent'].includes(col.fieldtype ?? '') ? 'text-right' : ''}`}
                        >
                          <Cell value={row[col.fieldname]} col={col} onDrillDown={handleDrillDown} row={row} />
                        </td>
                      ))}
                    </tr>
                  ))
                )}

                {/* Total row */}
                {data?.total_row && (
                  <tr style={{ background: 'var(--bg-card2)', borderTop: '2px solid var(--border)' }}>
                    {columns.map((col, ci) => (
                      <td key={col.fieldname} className={`px-3 py-2.5 font-bold text-sm ${ci > 0 && ['Currency', 'Float'].includes(col.fieldtype ?? '') ? 'text-right' : ''}`}>
                        {col.fieldtype === 'Currency' || col.fieldtype === 'Float'
                          ? formatINR(data.total_row![col.fieldname] as number)
                          : String(data.total_row![col.fieldname] ?? '')}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Filter summary */}
      {Object.keys(filters).length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={11} className="text-muted" />
          {Object.entries(filters).filter(([, v]) => v !== null && v !== '').map(([k, v]) => (
            <span key={k} className="card-inner text-[10px] px-2 py-0.5 text-muted">
              {k}: <span className="text-fg">{String(v)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
