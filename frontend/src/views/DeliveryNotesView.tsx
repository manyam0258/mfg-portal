import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { DataTable } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/EmptyState';
import { LABELS } from '@/constants/labels';
import { formatDate, formatINR } from '@/lib/format';

interface DeliveryNoteRow {
  name: string;
  customer: string;
  customer_name?: string;
  posting_date: string;
  grand_total: number;
  status: string;
  docstatus: number;
}

export function DeliveryNotesView() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const { data: notes, isLoading, error, mutate } = useFrappeGetDocList<DeliveryNoteRow>(
    'Delivery Note',
    {
      fields: ['name', 'customer', 'customer_name', 'posting_date', 'grand_total', 'status', 'docstatus'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filters: statusFilter !== 'All' ? ([['status', '=', statusFilter]] as any) : undefined,
      limit: 100,
      orderBy: { field: 'posting_date', order: 'desc' },
    },
    `dn-list-${statusFilter}`,
  );

  const columns = useMemo(() => [
    {
      key: 'name',
      header: LABELS.columns.deliveryNote.id,
      render: (row: DeliveryNoteRow) => (
        <Link
          to={`/delivery-notes/${encodeURIComponent(row.name)}`}
          className="font-mono text-xs font-semibold hover:underline"
          style={{ color: 'var(--primary)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: 'customer',
      header: LABELS.columns.deliveryNote.customer,
      render: (row: DeliveryNoteRow) => (
        <div>
          <p className="text-xs font-medium text-fg">{row.customer_name || row.customer}</p>
          <p className="text-[10px] text-muted">{row.customer}</p>
        </div>
      ),
    },
    {
      key: 'posting_date',
      header: LABELS.columns.deliveryNote.date,
      render: (row: DeliveryNoteRow) => <span className="text-xs text-muted">{formatDate(row.posting_date)}</span>,
    },
    {
      key: 'grand_total',
      header: LABELS.columns.deliveryNote.grandTotal,
      render: (row: DeliveryNoteRow) => (
        <span className="text-xs font-mono font-bold text-fg">{formatINR(row.grand_total)}</span>
      ),
    },
    {
      key: 'status',
      header: LABELS.columns.deliveryNote.status,
      render: (row: DeliveryNoteRow) => (
        <StatusPill status={row.status || (row.docstatus === 1 ? 'Submitted' : row.docstatus === 2 ? 'Cancelled' : 'Draft')} />
      ),
    },
  ], []);

  const totalValue = (notes ?? []).reduce((s, n) => s + (n.grand_total ?? 0), 0);
  const submittedCount = (notes ?? []).filter((n) => n.docstatus === 1).length;
  const draftCount = (notes ?? []).filter((n) => n.docstatus === 0).length;

  return (
    <AppShell
      title={LABELS.nav.deliveryNotes}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/delivery-notes/new')}
            className="btn-new"
          >
            <Plus size={14} />
            New Delivery Note
          </button>
        </div>
      }
    >
      {(search) => {
        const filtered = (notes ?? []).filter((row) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return (
            row.name.toLowerCase().includes(q) ||
            row.customer.toLowerCase().includes(q) ||
            (row.customer_name && row.customer_name.toLowerCase().includes(q))
          );
        });

        return (
          <>
            {/* Metric cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="card p-4">
                <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Total Delivery Notes</p>
                <p className="text-xl font-bold font-mono text-fg mt-1">{(notes ?? []).length}</p>
              </div>
              <div className="card p-4">
                <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Total Dispatched Value</p>
                <p className="text-xl font-bold font-mono text-fg mt-1" style={{ color: 'var(--primary)' }}>
                  {formatINR(totalValue)}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Submitted / Completed</p>
                <p className="text-xl font-bold font-mono mt-1 text-emerald-400">{submittedCount}</p>
              </div>
              <div className="card p-4">
                <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Draft Notes</p>
                <p className="text-xl font-bold font-mono mt-1 text-amber-400">{draftCount}</p>
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto">
              {['All', 'Draft', 'Submitted', 'To Bill', 'Completed', 'Cancelled'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === st ? 'bg-primary text-white font-semibold' : 'bg-card border border-line text-muted hover:text-fg'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Data Table */}
            <div className="card">
              {isLoading ? (
                <LoadingState />
              ) : error ? (
                <ErrorState message={String(error)} onRetry={() => mutate()} />
              ) : !filtered.length ? (
                <EmptyState message={LABELS.empty.deliveryNotes} />
              ) : (
                <DataTable
                  columns={columns as unknown as Parameters<typeof DataTable>[0]['columns']}
                  data={filtered as unknown as Record<string, unknown>[]}
                  onRowClick={(row) => navigate(`/delivery-notes/${encodeURIComponent(row['name'] as string)}`)}
                />
              )}
            </div>
          </>
        );
      }}
    </AppShell>
  );
}
