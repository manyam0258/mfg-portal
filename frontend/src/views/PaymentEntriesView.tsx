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

interface PaymentEntryRow {
  name: string;
  payment_type: string;
  party_type?: string;
  party?: string;
  party_name?: string;
  posting_date: string;
  paid_amount: number;
  received_amount: number;
  status: string;
  docstatus: number;
}

export function PaymentEntriesView() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<string>('All');

  const { data: payments, isLoading, error, mutate } = useFrappeGetDocList<PaymentEntryRow>(
    'Payment Entry',
    {
      fields: ['name', 'payment_type', 'party_type', 'party', 'party_name', 'posting_date', 'paid_amount', 'received_amount', 'status', 'docstatus'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filters: typeFilter !== 'All' ? ([['payment_type', '=', typeFilter]] as any) : undefined,
      limit: 100,
      orderBy: { field: 'posting_date', order: 'desc' },
    },
    `pe-list-${typeFilter}`,
  );

  const columns = useMemo(() => [
    {
      key: 'name',
      header: LABELS.columns.paymentEntry.id,
      render: (row: PaymentEntryRow) => (
        <Link
          to={`/payments/${encodeURIComponent(row.name)}`}
          className="font-mono text-xs font-semibold hover:underline"
          style={{ color: 'var(--primary)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: 'party',
      header: LABELS.columns.paymentEntry.party,
      render: (row: PaymentEntryRow) => (
        <div>
          <p className="text-xs font-medium text-fg">{row.party_name || row.party || '—'}</p>
          <p className="text-[10px] text-muted">{row.party_type ? `${row.party_type}: ${row.party}` : '—'}</p>
        </div>
      ),
    },
    {
      key: 'payment_type',
      header: LABELS.columns.paymentEntry.type,
      render: (row: PaymentEntryRow) => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          row.payment_type === 'Receive'
            ? 'bg-emerald-500/10 text-emerald-400'
            : row.payment_type === 'Pay'
            ? 'bg-rose-500/10 text-rose-400'
            : 'bg-blue-500/10 text-blue-400'
        }`}>
          {row.payment_type}
        </span>
      ),
    },
    {
      key: 'posting_date',
      header: LABELS.columns.paymentEntry.date,
      render: (row: PaymentEntryRow) => <span className="text-xs text-muted">{formatDate(row.posting_date)}</span>,
    },
    {
      key: 'paid_amount',
      header: LABELS.columns.paymentEntry.paid,
      render: (row: PaymentEntryRow) => (
        <span className="text-xs font-mono font-medium text-muted">
          {row.paid_amount > 0 ? formatINR(row.paid_amount) : '—'}
        </span>
      ),
    },
    {
      key: 'received_amount',
      header: LABELS.columns.paymentEntry.received,
      render: (row: PaymentEntryRow) => (
        <span className="text-xs font-mono font-bold" style={{ color: row.received_amount > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
          {row.received_amount > 0 ? formatINR(row.received_amount) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: LABELS.columns.paymentEntry.status,
      render: (row: PaymentEntryRow) => (
        <StatusPill status={row.status || (row.docstatus === 1 ? 'Submitted' : row.docstatus === 2 ? 'Cancelled' : 'Draft')} />
      ),
    },
  ], []);

  const totalReceived = (payments ?? [])
    .filter((p) => p.payment_type === 'Receive' && p.docstatus === 1)
    .reduce((s, p) => s + (p.received_amount ?? 0), 0);

  const totalPaid = (payments ?? [])
    .filter((p) => p.payment_type === 'Pay' && p.docstatus === 1)
    .reduce((s, p) => s + (p.paid_amount ?? 0), 0);

  return (
    <AppShell
      title={LABELS.nav.payments}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/payments/new')}
            className="btn-primary"
          >
            <Plus size={14} />
            Receive Payment
          </button>
        </div>
      }
    >
      {(search) => {
        const filtered = (payments ?? []).filter((row) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return (
            row.name.toLowerCase().includes(q) ||
            (row.party && row.party.toLowerCase().includes(q)) ||
            (row.party_name && row.party_name.toLowerCase().includes(q)) ||
            row.payment_type.toLowerCase().includes(q)
          );
        });

        return (
          <>
            {/* Metric cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="card p-4">
                <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Total Payments Recorded</p>
                <p className="text-xl font-bold font-mono text-fg mt-1">{(payments ?? []).length}</p>
              </div>
              <div className="card p-4">
                <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Total Received</p>
                <p className="text-xl font-bold font-mono mt-1 text-emerald-400">
                  {formatINR(totalReceived)}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Total Paid Out</p>
                <p className="text-xl font-bold font-mono mt-1 text-rose-400">
                  {formatINR(totalPaid)}
                </p>
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto">
              {['All', 'Receive', 'Pay', 'Internal Transfer'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setTypeFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    typeFilter === st ? 'bg-primary text-white font-semibold' : 'bg-card border border-line text-muted hover:text-fg'
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
                <EmptyState message={LABELS.empty.paymentEntries} />
              ) : (
                <DataTable
                  columns={columns as unknown as Parameters<typeof DataTable>[0]['columns']}
                  data={filtered as unknown as Record<string, unknown>[]}
                  onRowClick={(row) => navigate(`/payments/${encodeURIComponent(row['name'] as string)}`)}
                />
              )}
            </div>
          </>
        );
      }}
    </AppShell>
  );
}
