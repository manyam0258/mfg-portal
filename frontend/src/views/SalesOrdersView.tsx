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

interface SalesOrderRow {
  name: string;
  customer: string;
  customer_name?: string;
  transaction_date: string;
  delivery_date?: string;
  grand_total: number;
  status: string;
  delivery_status?: string;
  billing_status?: string;
}

export function SalesOrdersView() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const { data: orders, isLoading, error, mutate } = useFrappeGetDocList<SalesOrderRow>(
    'Sales Order',
    {
      fields: ['name', 'customer', 'customer_name', 'transaction_date', 'delivery_date', 'grand_total', 'status', 'delivery_status', 'billing_status'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filters: statusFilter !== 'All' ? ([['status', '=', statusFilter]] as any) : undefined,
      limit: 100,
      orderBy: { field: 'transaction_date', order: 'desc' },
    },
    `so-list-${statusFilter}`,
  );

  const columns = useMemo(() => [
    {
      key: 'name',
      header: LABELS.columns.salesOrder.id,
      render: (row: SalesOrderRow) => (
        <Link
          to={`/sales-orders/${encodeURIComponent(row.name)}`}
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
      header: LABELS.columns.salesOrder.customer,
      render: (row: SalesOrderRow) => (
        <div>
          <p className="text-xs font-medium text-fg">{row.customer_name || row.customer}</p>
          <p className="text-[10px] text-muted">{row.customer}</p>
        </div>
      ),
    },
    {
      key: 'transaction_date',
      header: LABELS.columns.salesOrder.date,
      render: (row: SalesOrderRow) => <span className="text-xs text-muted">{formatDate(row.transaction_date)}</span>,
    },
    {
      key: 'delivery_date',
      header: LABELS.columns.salesOrder.deliveryDate,
      render: (row: SalesOrderRow) => <span className="text-xs text-muted">{row.delivery_date ? formatDate(row.delivery_date) : '—'}</span>,
    },
    {
      key: 'grand_total',
      header: LABELS.columns.salesOrder.grandTotal,
      render: (row: SalesOrderRow) => (
        <span className="text-xs font-mono font-bold text-fg">{formatINR(row.grand_total)}</span>
      ),
    },
    {
      key: 'status',
      header: LABELS.columns.salesOrder.status,
      render: (row: SalesOrderRow) => <StatusPill status={row.status} />,
    },
  ], []);

  // Summary Metrics
  const totalValue = (orders ?? []).reduce((s, o) => s + (o.grand_total ?? 0), 0);
  const toDeliver = (orders ?? []).filter((o) => o.status === 'To Deliver and Bill' || o.status === 'To Deliver').length;
  const toBill = (orders ?? []).filter((o) => o.status === 'To Bill' || o.status === 'To Deliver and Bill').length;

  return (
    <AppShell
      title={LABELS.nav.salesOrders}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/sales-orders/new')}
            className="btn-new"
          >
            <Plus size={14} />
            New Sales Order
          </button>
        </div>
      }
    >
      {(search) => {
        const filtered = (orders ?? []).filter((row) => {
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
                <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Total Orders</p>
                <p className="text-xl font-bold font-mono text-fg mt-1">{(orders ?? []).length}</p>
              </div>
              <div className="card p-4">
                <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Total Order Value</p>
                <p className="text-xl font-bold font-mono text-fg mt-1" style={{ color: 'var(--primary)' }}>
                  {formatINR(totalValue)}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">To Deliver</p>
                <p className="text-xl font-bold font-mono mt-1 text-amber-400">{toDeliver}</p>
              </div>
              <div className="card p-4">
                <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">To Bill</p>
                <p className="text-xl font-bold font-mono mt-1 text-blue-400">{toBill}</p>
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto">
              {['All', 'To Deliver and Bill', 'To Deliver', 'To Bill', 'Completed', 'Cancelled'].map((st) => (
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
                <EmptyState message={LABELS.empty.salesOrders} />
              ) : (
                <DataTable
                  columns={columns as unknown as Parameters<typeof DataTable>[0]['columns']}
                  data={filtered as unknown as Record<string, unknown>[]}
                  onRowClick={(row) => navigate(`/sales-orders/${encodeURIComponent(row['name'] as string)}`)}
                />
              )}
            </div>
          </>
        );
      }}
    </AppShell>
  );
}
