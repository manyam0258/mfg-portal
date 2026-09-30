import { useState, useMemo } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { AppShell } from '@/components/layout/AppShell';
import { MetricStrip } from '@/components/layout/MetricStrip';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { LABELS } from '@/constants/labels';
import { formatINR, formatQty } from '@/lib/format';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StockProjectedRow {
  item_code?: string;
  item_name?: string;
  warehouse?: string;
  actual_qty?: number;
  projected_qty?: number;
  reorder_level?: number;
  reorder_qty?: number;
  stock_uom?: string;
}

interface StockBalanceRow {
  item_code?: string;
  warehouse?: string;
  valuation_rate?: number;
  stock_value?: number;
}

interface ReportResponse<T> {
  message: {
    result?: T[];
    columns?: unknown[];
  };
}

// ─── Stock Level Progress Bar ─────────────────────────────────────────────────

function StockLevelBar({
  actualQty,
  reorderLevel,
}: {
  actualQty: number;
  reorderLevel: number | undefined;
}) {
  if (reorderLevel === undefined || reorderLevel === null || reorderLevel === 0) {
    return <span className="text-xs text-slate-600 italic">No reorder level set</span>;
  }

  const alertThreshold = reorderLevel;
  const amberThreshold = reorderLevel * 1.5;

  let color: 'red' | 'amber' | 'green' = 'green';
  if (actualQty <= alertThreshold) color = 'red';
  else if (actualQty <= amberThreshold) color = 'amber';

  // Progress relative to 2x reorder level for visual scale
  const scale = reorderLevel * 3;
  const pct = scale > 0 ? Math.min((actualQty / scale) * 100, 100) : 0;

  return (
    <div className="min-w-[100px]">
      <p className="text-[10px] text-slate-500 mb-1">
        {formatQty(actualQty)} / {formatQty(reorderLevel)} (reorder)
      </p>
      <ProgressBar value={pct} color={color} />
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function StockView() {
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [belowOnly, setBelowOnly] = useState(false);

  // Stock Projected Qty report
  const { data: projData, isLoading: l1, error: e1 } = useFrappeGetCall<ReportResponse<StockProjectedRow>>(
    'frappe.desk.query_report.run',
    { report_name: 'Stock Projected Qty', filters: {} },
    'stock-projected-qty',
    { refreshInterval: 120000 },
  );

  // Stock Balance report for valuation
  const { data: balData } = useFrappeGetCall<ReportResponse<StockBalanceRow>>(
    'frappe.desk.query_report.run',
    { report_name: 'Stock Balance', filters: {} },
    'stock-balance',
    { refreshInterval: 120000 },
  );

  // Build a lookup for valuation from Stock Balance
  const valuationMap = useMemo(() => {
    const map = new Map<string, { valuation_rate: number; stock_value: number }>();
    (balData?.message?.result ?? []).forEach((row) => {
      if (row.item_code && row.warehouse) {
        map.set(`${row.item_code}::${row.warehouse}`, {
          valuation_rate: row.valuation_rate ?? 0,
          stock_value: row.stock_value ?? 0,
        });
      }
    });
    return map;
  }, [balData]);

  // Distinct warehouses for filter
  const warehouses = useMemo(() => {
    const set = new Set<string>();
    (projData?.message?.result ?? []).forEach((r) => {
      if (r.warehouse) set.add(r.warehouse);
    });
    return Array.from(set).sort();
  }, [projData]);

  const rows = useMemo(() => {
    return (projData?.message?.result ?? []).filter((row) => {
      if (!row.item_code) return false;
      if (warehouseFilter && row.warehouse !== warehouseFilter) return false;
      if (belowOnly) {
        if (row.reorder_level == null) return false;
        if ((row.actual_qty ?? 0) > (row.reorder_level ?? 0)) return false;
      }
      return true;
    });
  }, [projData, warehouseFilter, belowOnly]);

  const isLoading = l1;
  const error = e1;

  return (
    <AppShell title={LABELS.nav.stock}>
      {(search) => {
        const filtered = rows.filter((r) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return (
            r.item_code?.toLowerCase().includes(q) ||
            r.item_name?.toLowerCase().includes(q) ||
            r.warehouse?.toLowerCase().includes(q)
          );
        });

        return (
          <>
            <MetricStrip />

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <select
                id="stock-warehouse-filter"
                className="select-field w-56"
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
              >
                <option value="">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>

              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  id="stock-below-toggle"
                  type="checkbox"
                  checked={belowOnly}
                  onChange={(e) => setBelowOnly(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-accent-600"
                />
                Below reorder level only
              </label>
            </div>

            <div className="card overflow-x-auto">
              {isLoading ? (
                <LoadingState />
              ) : error ? (
                <ErrorState message={String(error)} />
              ) : !filtered.length ? (
                <EmptyState message={LABELS.empty.stock} />
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-brand-700/50">
                      {[
                        LABELS.columns.stock.item,
                        LABELS.columns.stock.warehouse,
                        LABELS.columns.stock.actualQty,
                        LABELS.columns.stock.reorderLevel,
                        LABELS.columns.stock.level,
                        LABELS.columns.stock.valuationRate,
                        LABELS.columns.stock.stockValue,
                      ].map((h) => (
                        <th key={h} className="table-header text-left px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, idx) => {
                      const valuation = valuationMap.get(`${row.item_code}::${row.warehouse}`);
                      const isAlert =
                        row.reorder_level != null &&
                        (row.actual_qty ?? 0) <= (row.reorder_level ?? 0);

                      return (
                        <tr
                          key={idx}
                          className={`border-b border-brand-700/30 hover:bg-brand-800/40 transition-colors ${
                            isAlert ? 'bg-accent-950/20' : ''
                          }`}
                        >
                          <td className="table-cell">
                            <p className="font-medium text-slate-100">{row.item_name || row.item_code}</p>
                            <p className="text-[10px] text-slate-500">{row.item_code}</p>
                          </td>
                          <td className="table-cell text-xs text-slate-400">{row.warehouse}</td>
                          <td className="table-cell">
                            <span className={`text-sm font-semibold ${isAlert ? 'text-accent-400' : 'text-slate-100'}`}>
                              {formatQty(row.actual_qty ?? 0)} {row.stock_uom}
                            </span>
                          </td>
                          <td className="table-cell text-xs text-slate-400">
                            {row.reorder_level != null ? formatQty(row.reorder_level) : '—'}
                          </td>
                          <td className="table-cell">
                            <StockLevelBar
                              actualQty={row.actual_qty ?? 0}
                              reorderLevel={row.reorder_level}
                            />
                          </td>
                          <td className="table-cell text-xs text-slate-300">
                            {valuation ? formatINR(valuation.valuation_rate) : '—'}
                          </td>
                          <td className="table-cell text-xs text-slate-300">
                            {valuation ? formatINR(valuation.stock_value) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        );
      }}
    </AppShell>
  );
}
