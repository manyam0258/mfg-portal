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

interface SalesInvoiceRow {
  name: string;
  customer: string;
  customer_name?: string;
  posting_date: string;
  grand_total: number;
  outstanding_amount: number;
  status: string;
  docstatus: number;
}

export function SalesInvoicesView() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const { data: invoices, isLoading, error, mutate } = useFrappeGetDocList<SalesInvoiceRow>(
    'Sales Invoice',
    {
      fields: ['name', 'customer', 'customer_name', 'posting_date', 'grand_total', 'outstanding_amount', 'status', 'docstatus'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filters: statusFilter !== 'All' ? ([['status', '=', statusFilter]] as any) : undefined,
      limit: 100,
      orderBy: { field: 'posting_date', order: 'desc' },
    },
    `si-list-${statusFilter}`,
  );

  const columns = useMemo(() => [
    {
      key: 'name',
      header: LABELS.columns.salesInvoice.id,
      render: (row: SalesInvoiceRow) => (
        <Link
          to={`/sales-invoices/${encodeURIComponent(row.name)}`}
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
      header: LABELS.columns.salesInvoice.customer,
      render: (row: SalesInvoiceRow) => (
        <div>
          <p className="text-xs font-medium text-fg">{row.customer_name || row.customer}</p>
          <p className="text-[10px] text-muted">{row.customer}</p>
        </div>
      ),
    },
    {
      key: 'posting_date',
      header: LABELS.columns.salesInvoice.date,
      render: (row: SalesInvoiceRow) => <span className="text-xs text-muted">{formatDate(row.posting_date)}</span>,
    },
    {
      key: 'grand_total',
      header: LABELS.columns.salesInvoice.grandTotal,
      render: (row: SalesInvoiceRow) => (
        <span className="text-xs font-mono font-bold text-fg">{formatINR(row.grand_total)}</span>
      ),
    },
    {
      key: 'outstanding_amount',
      header: LABELS.columns.salesInvoice.outstanding,
      render: (row: SalesInvoiceRow) => (
        <span
          className="text-xs font-mono font-bold"
          style={{ color: row.outstanding_amount > 0 ? 'var(--accent)' : 'var(--success)' }}
        >
          {formatINR(row.outstanding_amount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: LABELS.columns.salesInvoice.status,
      render: (row: SalesInvoiceRow) => (
        <StatusPill status={row.status || (row.docstatus === 1 ? 'Submitted' : row.docstatus === 2 ? 'Cancelled' : 'Draft')} />
      ),
    },
  ], []);

  const totalBilled = (invoices ?? []).reduce((s, inv) => s + (inv.grand_total ?? 0), 0);
  const totalOutstanding = (invoices ?? []).reduce((s, inv) => s + (inv.outstanding_amount ?? 0), 0);
  const paidCount = (invoices ?? []).filter((inv) => inv.status === 'Paid' || (inv.docstatus === 1 && inv.outstanding_amount <= 0)).length;

  return (
    <AppShell
      title={LABELS.nav.salesInvoices}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/sales-invoices/new')}
            className="btn-new"
          >
            <Plus size={14} />
            New Sales Invoice
          </button>
        </div>
      }
    >
      {(search) => {
        const filtered = (invoices ?? []).filter((row) => {
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
                <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Total Invoices</p>
                <p className="text-xl font-bold font-mono text-fg mt-1">{(invoices ?? []).length}</p>
              </div>
              <div className="card p-4">
                <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Total Billed</p>
                <p className="text-xl font-bold font-mono text-fg mt-1" style={{ color: 'var(--primary)' }}>
                  {formatINR(totalBilled)}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Total Outstanding</p>
                <p className="text-xl font-bold font-mono mt-1" style={{ color: 'var(--accent)' }}>
                  {formatINR(totalOutstanding)}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Paid Invoices</p>
                <p className="text-xl font-bold font-mono mt-1 text-emerald-400">{paidCount}</p>
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto">
              {['All', 'Draft', 'Unpaid', 'Paid', 'Overdue', 'Cancelled'].map((st) => (
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
                <EmptyState message={LABELS.empty.salesInvoices} />
              ) : (
                <DataTable
                  columns={columns as unknown as Parameters<typeof DataTable>[0]['columns']}
                  data={filtered as unknown as Record<string, unknown>[]}
                  onRowClick={(row) => navigate(`/sales-invoices/${encodeURIComponent(row['name'] as string)}`)}
                />
              )}
            </div>
          </>
        );
      }}
    </AppShell>
  );
}
