import { useState, useMemo } from 'react';
import { useFrappeGetCall, useFrappeGetDocList } from 'frappe-react-sdk';
import { useNavigate } from 'react-router-dom';
import { TrendingDown, TrendingUp, Scale, Layers } from 'lucide-react';
import { LABELS } from '@/constants/labels';
import { formatINR, formatDate, formatQty } from '@/lib/format';
import { LoadingState, EmptyState } from '@/components/ui/EmptyState';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportResult {
  result?: Record<string, unknown>[];
  columns?: unknown[];
  report_summary?: Array<{ label: string; value: string | number; indicator?: string }>;
}

export interface SLERow {
  date?: string;
  item_code?: string;
  item_name?: string;
  warehouse?: string;
  actual_qty?: number;
  qty_after_transaction?: number;
  voucher_type?: string;
  voucher_no?: string;
  incoming_rate?: number;
  valuation_rate?: number;
  stock_value_difference?: number;
  stock_value?: number;
}

export interface GLRow {
  posting_date?: string;
  account?: string;
  debit?: number;
  credit?: number;
  balance?: number;
  voucher_type?: string;
  voucher_no?: string;
  against?: string;
  party?: string;
  remarks?: string;
}

// ─── Impact Summary strip ─────────────────────────────────────────────────────

interface ImpactItem {
  label: string;
  value: number;
  color?: string;
}

function ImpactSummary({ items }: { items: ImpactItem[] }) {
  const visibleItems = items.filter((it) => it.value !== 0);
  if (!visibleItems.length) return null;

  return (
    <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-xl bg-card border border-line">
      <p className="text-[10px] text-muted uppercase tracking-wide w-full font-semibold">
        {LABELS.ledger.impactSummary}
      </p>
      {visibleItems.map((item, i) => (
        <div key={i} className="flex-1 min-w-[120px]">
          <p className="text-[10px] text-muted mb-0.5">{item.label}</p>
          <p className="text-sm font-bold font-mono" style={{ color: item.color ?? 'var(--text)' }}>
            {formatINR(item.value)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Stock Ledger Tab ─────────────────────────────────────────────────────────

export interface StockLedgerTabProps {
  voucherNo: string;
  voucherType?: string;
  company?: string;
  postingDate?: string;
  workOrder?: string;
}

export function StockLedgerTab({ voucherNo, voucherType = 'Stock Entry', company = '', postingDate, workOrder }: StockLedgerTabProps) {
  const dateFilter = postingDate ? { from_date: postingDate, to_date: postingDate } : {};

  // For Work Orders, fetch linked Stock Entries
  const { data: linkedSE } = useFrappeGetDocList<{ name: string; stock_entry_type: string }>(
    'Stock Entry',
    {
      fields: ['name', 'stock_entry_type'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filters: workOrder ? ([['work_order', '=', workOrder], ['docstatus', '=', 1]] as any) : undefined,
      limit: 50,
    },
    workOrder ? `wo-linked-se-${workOrder}` : null,
  );

  const [selectedVoucher, setSelectedVoucher] = useState<string>('');

  const targetVoucher = useMemo(() => {
    if (!workOrder) return voucherNo;
    if (selectedVoucher) return selectedVoucher;
    return linkedSE?.[0]?.name || '';
  }, [workOrder, selectedVoucher, linkedSE, voucherNo]);

  // Primary: report API (matches exactly what the desk shows)
  const { data: reportData, isLoading: rLoading, error: rError } = useFrappeGetCall<ReportResult>(
    'frappe.desk.query_report.run',
    {
      report_name: 'Stock Ledger',
      filters: JSON.stringify({ voucher_no: targetVoucher, company, ...dateFilter }),
    },
    targetVoucher ? `sl-${targetVoucher}` : null,
    { revalidateOnFocus: false },
  );

  // Fallback: get_list on Stock Ledger Entry
  const shouldFallback = !rLoading && (rError || !reportData?.result?.length);
  const { data: sleData, isLoading: sleLoading } = useFrappeGetDocList<SLERow>(
    'Stock Ledger Entry',
    {
      fields: [
        'date', 'item_code', 'item_name', 'warehouse', 'actual_qty', 'qty_after_transaction',
        'voucher_type', 'voucher_no', 'incoming_rate', 'valuation_rate', 'stock_value_difference', 'stock_value',
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filters: targetVoucher ? ([['voucher_type', '=', voucherType], ['voucher_no', '=', targetVoucher], ['is_cancelled', '=', 0]] as any) : undefined,
      limit: 100,
    },
    shouldFallback && targetVoucher ? `sle-fb-${targetVoucher}` : null,
  );

  const isLoading = rLoading || (shouldFallback && sleLoading);

  const rows = useMemo((): SLERow[] => {
    if (reportData?.result?.length) {
      return (reportData.result as SLERow[]).filter((r) => r.item_code || r.voucher_no);
    }
    return sleData ?? [];
  }, [reportData, sleData]);

  const totalIn = rows.reduce((s, r) => s + Math.max(r.actual_qty ?? 0, 0), 0);
  const totalOut = rows.reduce((s, r) => s + Math.abs(Math.min(r.actual_qty ?? 0, 0)), 0);
  const totalValue = rows.reduce((s, r) => s + Math.abs(r.stock_value_difference ?? 0), 0);

  return (
    <div className="space-y-4">
      {workOrder && linkedSE && linkedSE.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-card border border-line rounded-lg">
          <Layers size={14} className="text-primary flex-shrink-0" />
          <span className="text-xs text-muted">Rollup Stock Entries ({linkedSE.length}):</span>
          <div className="flex gap-1.5 flex-wrap">
            {linkedSE.map((se) => (
              <button
                key={se.name}
                type="button"
                onClick={() => setSelectedVoucher(se.name)}
                className={`text-xs px-2.5 py-1 rounded font-mono transition-colors ${
                  targetVoucher === se.name
                    ? 'bg-primary text-white font-semibold'
                    : 'bg-card2 text-muted hover:text-fg'
                }`}
              >
                {se.name} ({se.stock_entry_type})
              </button>
            ))}
          </div>
        </div>
      )}

      <ImpactSummary
        items={[
          { label: LABELS.ledger.totalValueMoved, value: totalValue },
          { label: 'Total Inflow Qty', value: totalIn, color: 'var(--success)' },
          { label: 'Total Outflow Qty', value: totalOut, color: 'var(--accent)' },
        ]}
      />

      {isLoading ? (
        <LoadingState />
      ) : !rows.length ? (
        <EmptyState message={LABELS.ledger.noStockEntries} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-card2">
                {[
                  'Date',
                  'Item',
                  'Warehouse',
                  'In Qty',
                  'Out Qty',
                  'Balance Qty',
                  'Incoming Rate',
                  'Valuation Rate',
                  'Balance Value',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide text-left whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const qty = row.actual_qty ?? 0;
                const inQty = qty > 0 ? qty : 0;
                const outQty = qty < 0 ? Math.abs(qty) : 0;
                return (
                  <tr key={i} className="table-row-hover border-b border-line">
                    <td className="table-cell text-xs">{formatDate(row.date)}</td>
                    <td className="table-cell">
                      <p className="text-sm font-medium text-fg">{row.item_name || row.item_code}</p>
                      <p className="text-[10px] text-muted">{row.item_code}</p>
                    </td>
                    <td className="table-cell text-xs text-muted">{row.warehouse}</td>
                    <td
                      className="table-cell text-xs font-mono font-semibold"
                      style={{ color: inQty > 0 ? 'var(--success)' : 'var(--text-muted)' }}
                    >
                      {inQty > 0 ? `+${formatQty(inQty)}` : '—'}
                    </td>
                    <td
                      className="table-cell text-xs font-mono font-semibold"
                      style={{ color: outQty > 0 ? 'var(--accent)' : 'var(--text-muted)' }}
                    >
                      {outQty > 0 ? `-${formatQty(outQty)}` : '—'}
                    </td>
                    <td className="table-cell text-xs font-mono text-fg">{formatQty(row.qty_after_transaction ?? 0)}</td>
                    <td className="table-cell text-xs font-mono text-muted">{formatINR(row.incoming_rate)}</td>
                    <td className="table-cell text-xs font-mono text-muted">{formatINR(row.valuation_rate)}</td>
                    <td className="table-cell text-xs font-mono text-fg">{formatINR(row.stock_value)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Accounting Ledger Tab ────────────────────────────────────────────────────

export interface AccountingLedgerTabProps {
  voucherNo: string;
  voucherType: string;
  company?: string;
  postingDate?: string;
  workOrder?: string;
  onAccountClick?: (account: string) => void;
}

export function AccountingLedgerTab({
  voucherNo,
  voucherType,
  company = '',
  postingDate,
  workOrder,
  onAccountClick,
}: AccountingLedgerTabProps) {
  const navigate = useNavigate();
  const dateFilter = postingDate ? { from_date: postingDate, to_date: postingDate } : {};

  // For Work Orders, fetch linked Stock Entries
  const { data: linkedSE } = useFrappeGetDocList<{ name: string; stock_entry_type: string }>(
    'Stock Entry',
    {
      fields: ['name', 'stock_entry_type'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filters: workOrder ? ([['work_order', '=', workOrder], ['docstatus', '=', 1]] as any) : undefined,
      limit: 50,
    },
    workOrder ? `wo-linked-gl-se-${workOrder}` : null,
  );

  const [selectedVoucher, setSelectedVoucher] = useState<string>('');

  const targetVoucher = useMemo(() => {
    if (!workOrder) return voucherNo;
    if (selectedVoucher) return selectedVoucher;
    return linkedSE?.[0]?.name || '';
  }, [workOrder, selectedVoucher, linkedSE, voucherNo]);

  const targetVoucherType = workOrder ? 'Stock Entry' : voucherType;

  // Primary: General Ledger report, grouped by voucher (matches desk)
  const { data: reportData, isLoading: rLoading, error: rError } = useFrappeGetCall<ReportResult>(
    'frappe.desk.query_report.run',
    {
      report_name: 'General Ledger',
      filters: JSON.stringify({
        voucher_no: targetVoucher,
        company,
        group_by: 'Group by Voucher (Consolidated)',
        ...dateFilter,
      }),
    },
    targetVoucher ? `gl-${targetVoucher}` : null,
    { revalidateOnFocus: false },
  );

  // Fallback: GL Entry get_list
  const shouldFallback = !rLoading && (rError || !reportData?.result?.length);
  const { data: glData, isLoading: glLoading } = useFrappeGetDocList<GLRow>(
    'GL Entry',
    {
      fields: ['posting_date', 'account', 'debit', 'credit', 'voucher_type', 'voucher_no', 'against', 'party', 'remarks'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filters: targetVoucher ? ([['voucher_type', '=', targetVoucherType], ['voucher_no', '=', targetVoucher], ['is_cancelled', '=', 0]] as any) : undefined,
      limit: 100,
    },
    shouldFallback && targetVoucher ? `gl-fb-${targetVoucher}` : null,
  );

  const isLoading = rLoading || (shouldFallback && glLoading);

  const rows = useMemo((): GLRow[] => {
    if (reportData?.result?.length) {
      return (reportData.result as GLRow[]).filter((r) => r.account || r.voucher_no);
    }
    return glData ?? [];
  }, [reportData, glData]);

  const totalDebit = rows.reduce((s, r) => s + (r.debit ?? 0), 0);
  const totalCredit = rows.reduce((s, r) => s + (r.credit ?? 0), 0);
  const isBalanced = rows.length > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

  // Specific accounts for Impact Summary (Section C requirement 4)
  const cogsAmount = rows
    .filter((r) => (r.account ?? '').toLowerCase().includes('cost of goods sold'))
    .reduce((s, r) => s + (r.debit ?? 0), 0);

  const stockInHandAmount = rows
    .filter((r) => (r.account ?? '').toLowerCase().includes('stock in hand'))
    .reduce((s, r) => s + ((r.debit ?? 0) > 0 ? (r.debit ?? 0) : (r.credit ?? 0)), 0);

  const debtorsAmount = rows
    .filter((r) => (r.account ?? '').toLowerCase().includes('debtors'))
    .reduce((s, r) => s + ((r.debit ?? 0) > 0 ? (r.debit ?? 0) : (r.credit ?? 0)), 0);

  const salesAmount = rows
    .filter((r) => (r.account ?? '').toLowerCase().includes('sales'))
    .reduce((s, r) => s + (r.credit ?? 0), 0);

  return (
    <div className="space-y-4">
      {workOrder && linkedSE && linkedSE.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-card border border-line rounded-lg">
          <Layers size={14} className="text-primary flex-shrink-0" />
          <span className="text-xs text-muted">Rollup Stock Entries ({linkedSE.length}):</span>
          <div className="flex gap-1.5 flex-wrap">
            {linkedSE.map((se) => (
              <button
                key={se.name}
                type="button"
                onClick={() => setSelectedVoucher(se.name)}
                className={`text-xs px-2.5 py-1 rounded font-mono transition-colors ${
                  targetVoucher === se.name
                    ? 'bg-primary text-white font-semibold'
                    : 'bg-card2 text-muted hover:text-fg'
                }`}
              >
                {se.name} ({se.stock_entry_type})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Impact summary strip */}
      <div className="flex items-center gap-3 flex-wrap">
        <ImpactSummary
          items={[
            { label: LABELS.ledger.totalDebit, value: totalDebit, color: 'var(--accent)' },
            { label: LABELS.ledger.totalCredit, value: totalCredit, color: 'var(--success)' },
            { label: 'COGS', value: cogsAmount, color: 'var(--accent)' },
            { label: 'Stock In Hand', value: stockInHandAmount, color: 'var(--primary)' },
            { label: 'Debtors', value: debtorsAmount, color: 'var(--primary)' },
            { label: 'Sales', value: salesAmount, color: 'var(--success)' },
          ]}
        />
        {!isLoading && rows.length > 0 && (
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              isBalanced ? 'bg-emerald-900/30 text-emerald-400' : 'bg-amber-900/30 text-amber-400'
            }`}
          >
            <Scale size={12} />
            {isBalanced ? LABELS.ledger.balanced : 'Unbalanced'}
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !rows.length ? (
        <EmptyState message={LABELS.ledger.noGLEntries} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-card2">
                {[
                  'Posting Date',
                  'Account',
                  'Debit (₹)',
                  'Credit (₹)',
                  'Against Account',
                  'Party',
                  'Remarks',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide text-left whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="table-row-hover border-b border-line">
                  <td className="table-cell text-xs text-muted">{formatDate(row.posting_date)}</td>
                  <td className="table-cell">
                    {row.account ? (
                      <button
                        type="button"
                        onClick={() =>
                          onAccountClick
                            ? onAccountClick(row.account!)
                            : navigate(
                                `/reports/general-ledger?account=${encodeURIComponent(
                                  row.account!,
                                )}&voucher_no=${encodeURIComponent(targetVoucher)}`,
                              )
                        }
                        className="text-sm font-medium underline decoration-dotted hover:opacity-75 text-left"
                        style={{ color: 'var(--primary)' }}
                      >
                        {row.account}
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="table-cell">
                    {(row.debit ?? 0) > 0 ? (
                      <span className="flex items-center gap-1 font-mono text-xs" style={{ color: 'var(--accent)' }}>
                        <TrendingDown size={11} />
                        {formatINR(row.debit)}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="table-cell">
                    {(row.credit ?? 0) > 0 ? (
                      <span className="flex items-center gap-1 font-mono text-xs" style={{ color: 'var(--success)' }}>
                        <TrendingUp size={11} />
                        {formatINR(row.credit)}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="table-cell text-xs text-muted">{row.against ?? '—'}</td>
                  <td className="table-cell text-xs text-muted">{row.party ?? '—'}</td>
                  <td className="table-cell text-xs text-muted truncate max-w-[160px]">{row.remarks ?? '—'}</td>
                </tr>
              ))}

              {/* Totals row */}
              <tr className="bg-card2 border-t-2 border-line">
                <td className="table-cell font-bold text-fg" colSpan={2}>
                  Total
                </td>
                <td className="table-cell font-bold font-mono text-xs" style={{ color: 'var(--accent)' }}>
                  {formatINR(totalDebit)}
                </td>
                <td className="table-cell font-bold font-mono text-xs" style={{ color: 'var(--success)' }}>
                  {formatINR(totalCredit)}
                </td>
                <td colSpan={3} />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
