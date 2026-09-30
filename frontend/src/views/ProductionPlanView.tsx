import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFrappeGetDocList, useFrappeGetDoc } from 'frappe-react-sdk';
import { ExternalLink } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { MetricStrip } from '@/components/layout/MetricStrip';
import { DataTable } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/EmptyState';
import { LABELS } from '@/constants/labels';
import { formatDate, formatQty } from '@/lib/format';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProdPlanRow {
  name: string;
  posting_date: string;
  status: string;
  total_planned_qty: number;
  total_produced_qty: number;
}

interface ProdPlanDoc extends ProdPlanRow {
  company: string;
  po_items: Array<{
    item_code: string;
    item_name: string;
    planned_qty: number;
    produced_qty: number;
    sales_order: string;
  }>;
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

function ProdPlanDrawer({ name, onClose }: { name: string | null; onClose: () => void }) {
  const { data: pp, isLoading } = useFrappeGetDoc<ProdPlanDoc>('Production Plan', name ?? undefined);

  return (
    <Drawer open={!!name} onClose={onClose} title={LABELS.productionPlan}>
      {!name ? null : isLoading ? (
        <LoadingState />
      ) : !pp ? (
        <ErrorState message="Production Plan not found" />
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-bold text-slate-100">{pp.name}</p>
              <p className="text-sm text-slate-400">{formatDate(pp.posting_date)} · {pp.company}</p>
            </div>
            <StatusPill status={pp.status} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-brand-800/50">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Planned Qty</p>
              <p className="text-sm font-semibold text-slate-100">{formatQty(pp.total_planned_qty)}</p>
            </div>
            <div className="p-3 rounded-lg bg-brand-800/50">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Produced Qty</p>
              <p className="text-sm font-semibold text-slate-100">{formatQty(pp.total_produced_qty)}</p>
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">Items</p>
            <div className="space-y-2">
              {(pp.po_items ?? []).map((item, idx) => {
                const pct = item.planned_qty > 0 ? (item.produced_qty / item.planned_qty) * 100 : 0;
                return (
                  <div key={idx} className="p-3 rounded-lg bg-brand-800/40 text-xs">
                    <div className="flex justify-between mb-1.5">
                      <p className="font-medium text-slate-200">{item.item_name || item.item_code}</p>
                      <span className="text-slate-400">{formatQty(item.planned_qty)}</span>
                    </div>
                    <ProgressBar value={pct} color="brand" showLabel />
                  </div>
                );
              })}
            </div>
          </div>

          <Link
            to={`/production-plans/${encodeURIComponent(name)}`}
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

export function ProductionPlanView() {
  const [drawerName, setDrawerName] = useState<string | null>(null);

  const { data: plans, isLoading, error } = useFrappeGetDocList<ProdPlanRow>('Production Plan', {
    fields: ['name', 'posting_date', 'status', 'total_planned_qty', 'total_produced_qty'],
    limit: 100,
    orderBy: { field: 'posting_date', order: 'desc' },
  });

  const columns = useMemo(() => [
    {
      key: 'name',
      header: LABELS.columns.productionPlan.id,
      render: (row: ProdPlanRow) => (
        <span className="font-mono text-xs text-brand-300">{row.name}</span>
      ),
    },
    {
      key: 'posting_date',
      header: LABELS.columns.productionPlan.date,
      render: (row: ProdPlanRow) => (
        <span className="text-xs text-slate-400">{formatDate(row.posting_date)}</span>
      ),
    },
    {
      key: 'status',
      header: LABELS.columns.productionPlan.status,
      render: (row: ProdPlanRow) => <StatusPill status={row.status} />,
    },
    {
      key: 'total_planned_qty',
      header: LABELS.columns.productionPlan.plannedQty,
      render: (row: ProdPlanRow) => (
        <span className="text-sm">{formatQty(row.total_planned_qty)}</span>
      ),
    },
    {
      key: 'total_produced_qty',
      header: LABELS.columns.productionPlan.producedQty,
      render: (row: ProdPlanRow) => {
        const pct = row.total_planned_qty > 0
          ? (row.total_produced_qty / row.total_planned_qty) * 100
          : 0;
        return (
          <div className="min-w-[100px]">
            <p className="text-xs text-slate-300 mb-1">{formatQty(row.total_produced_qty)}</p>
            <ProgressBar value={pct} color="brand" />
          </div>
        );
      },
    },
  ], []);

  return (
    <AppShell title={LABELS.nav.productionPlans}>
      {(search) => {
        const filtered = (plans ?? []).filter((p) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return p.name.toLowerCase().includes(q) || p.status?.toLowerCase().includes(q);
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
                <EmptyState message={LABELS.empty.productionPlans} />
              ) : (
                <DataTable
                  columns={columns as unknown as Parameters<typeof DataTable>[0]['columns']}
                  data={filtered as unknown as Record<string, unknown>[]}
                  onRowClick={(row) => setDrawerName(row['name'] as string)}
                />
              )}
            </div>

            <ProdPlanDrawer name={drawerName} onClose={() => setDrawerName(null)} />
          </>
        );
      }}
    </AppShell>
  );
}
