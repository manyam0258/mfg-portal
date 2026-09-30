import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFrappeGetDocList, useFrappeGetDoc } from 'frappe-react-sdk';
import { ExternalLink } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { MetricStrip } from '@/components/layout/MetricStrip';
import { DataTable } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/EmptyState';
import { LABELS } from '@/constants/labels';
import { formatDate, formatINR } from '@/lib/format';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StockEntryRow {
  name: string;
  stock_entry_type: string;
  work_order: string;
  posting_date: string;
  total_outgoing_value: number;
  total_incoming_value: number;
  docstatus: number;
}

interface StockEntryDoc {
  name: string;
  stock_entry_type: string;
  work_order: string;
  posting_date: string;
  total_outgoing_value: number;
  total_incoming_value: number;
  docstatus: number;
  from_warehouse: string;
  to_warehouse: string;
  items: Array<{
    item_code: string;
    item_name: string;
    qty: number;
    basic_rate: number;
    amount: number;
    s_warehouse: string;
    t_warehouse: string;
  }>;
}

function docstatusLabel(docstatus: number): string {
  if (docstatus === 0) return 'Draft';
  if (docstatus === 1) return 'Submitted';
  return 'Cancelled';
}

// ─── Stock Entry Drawer ───────────────────────────────────────────────────────

function StockEntryDrawer({ name, onClose }: { name: string | null; onClose: () => void }) {
  const { data: se, isLoading } = useFrappeGetDoc<StockEntryDoc>('Stock Entry', name ?? undefined);

  return (
    <Drawer open={!!name} onClose={onClose} title={LABELS.stockEntry}>
      {!name ? null : isLoading ? (
        <LoadingState />
      ) : !se ? (
        <ErrorState message="Stock Entry not found" />
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-bold text-slate-100">{se.name}</p>
              <p className="text-sm text-slate-400">{se.stock_entry_type}</p>
            </div>
            <StatusPill status={docstatusLabel(se.docstatus)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Work Order', value: se.work_order },
              { label: 'Date', value: formatDate(se.posting_date) },
              { label: 'Outgoing Value', value: formatINR(se.total_outgoing_value) },
              { label: 'Incoming Value', value: formatINR(se.total_incoming_value) },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-lg bg-brand-800/50">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-sm text-slate-200">{value || '—'}</p>
              </div>
            ))}
          </div>

          {/* Items */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">Items</p>
            <div className="space-y-1.5">
              {(se.items ?? []).map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-brand-800/40 text-xs">
                  <div className="flex justify-between mb-0.5">
                    <p className="font-medium text-slate-200">{item.item_name || item.item_code}</p>
                    <p className="text-slate-300">{item.qty}</p>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>{item.s_warehouse || '→'} {item.t_warehouse}</span>
                    <span>{formatINR(item.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link
            to={`/stock-entries/${encodeURIComponent(name)}`}
            className="btn-ghost w-full justify-center text-xs"
          >
            <ExternalLink size={12} />
            {LABELS.viewInPortal}
          </Link>
        </>
      )}
    </Drawer>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function StockEntryView() {
  const [drawerName, setDrawerName] = useState<string | null>(null);

  const { data: entries, isLoading, error } = useFrappeGetDocList<StockEntryRow>('Stock Entry', {
    fields: ['name', 'stock_entry_type', 'work_order', 'posting_date', 'total_outgoing_value', 'total_incoming_value', 'docstatus'],
    filters: [['purpose', 'in', ['Material Transfer for Manufacture', 'Manufacture', 'Material Transfer']]],
    limit: 100,
    orderBy: { field: 'posting_date', order: 'desc' },
  });

  const columns = useMemo(() => [
    {
      key: 'name',
      header: LABELS.columns.stockEntry.id,
      render: (row: StockEntryRow) => (
        <span className="font-mono text-xs text-brand-300">{row.name}</span>
      ),
    },
    {
      key: 'stock_entry_type',
      header: LABELS.columns.stockEntry.type,
      render: (row: StockEntryRow) => <span className="text-xs">{row.stock_entry_type}</span>,
    },
    {
      key: 'work_order',
      header: LABELS.columns.stockEntry.workOrder,
      render: (row: StockEntryRow) => (
        <span className="text-xs text-slate-400">{row.work_order || '—'}</span>
      ),
    },
    {
      key: 'posting_date',
      header: LABELS.columns.stockEntry.date,
      render: (row: StockEntryRow) => (
        <span className="text-xs text-slate-400">{formatDate(row.posting_date)}</span>
      ),
    },
    {
      key: 'total_outgoing_value',
      header: LABELS.columns.stockEntry.outgoing,
      render: (row: StockEntryRow) => (
        <span className="text-xs text-accent-400">{formatINR(row.total_outgoing_value)}</span>
      ),
    },
    {
      key: 'total_incoming_value',
      header: LABELS.columns.stockEntry.incoming,
      render: (row: StockEntryRow) => (
        <span className="text-xs text-emerald-400">{formatINR(row.total_incoming_value)}</span>
      ),
    },
    {
      key: 'docstatus',
      header: LABELS.columns.stockEntry.status,
      render: (row: StockEntryRow) => (
        <StatusPill status={docstatusLabel(row.docstatus)} />
      ),
    },
  ], []);

  return (
    <AppShell title={LABELS.nav.stockEntries}>
      {(search) => {
        const filtered = (entries ?? []).filter((e) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return (
            e.name.toLowerCase().includes(q) ||
            e.work_order?.toLowerCase().includes(q) ||
            e.stock_entry_type?.toLowerCase().includes(q)
          );
        });

        return (
          <>
            <MetricStrip />
            <div className="card">
              {isLoading ? (
                <LoadingState />
              ) : error ? (
                <ErrorState message={String(error)} />
              ) : !filtered.length ? (
                <EmptyState message={LABELS.empty.stockEntries} />
              ) : (
                <DataTable
                  columns={columns as unknown as Parameters<typeof DataTable>[0]['columns']}
                  data={filtered as unknown as Record<string, unknown>[]}
                  onRowClick={(row) => setDrawerName(row['name'] as string)}
                />
              )}
            </div>

            <StockEntryDrawer name={drawerName} onClose={() => setDrawerName(null)} />
          </>
        );
      }}
    </AppShell>
  );
}
