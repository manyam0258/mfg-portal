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
import { formatINR, formatQty } from '@/lib/format';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BOMRow {
  name: string;
  item: string;
  item_name: string;
  quantity: number;
  uom: string;
  total_cost: number;
  is_default: number;
  with_operations: number;
}

interface BOMItem {
  item_code: string;
  item_name: string;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
}

interface BOMOperation {
  operation: string;
  workstation: string;
  time_in_mins: number;
  hour_rate: number;
}

interface BOMScrap {
  item_code: string;
  item_name: string;
  stock_qty: number;
  rate: number;
  amount: number;
}

interface BOMDoc {
  name: string;
  item: string;
  item_name: string;
  quantity: number;
  uom: string;
  items: BOMItem[];
  operations: BOMOperation[];
  scrap_items: BOMScrap[];
  raw_material_cost: number;
  operating_cost: number;
  scrap_material_cost: number;
  total_cost: number;
  is_default: number;
}

// ─── BOM Detail Drawer ────────────────────────────────────────────────────────

interface BOMDrawerProps {
  name: string | null;
  onClose: () => void;
}

function BOMDrawer({ name, onClose }: BOMDrawerProps) {
  const { data: bom, isLoading } = useFrappeGetDoc<BOMDoc>('BOM', name ?? undefined);
  const [activeTab, setActiveTab] = useState<'raw' | 'ops' | 'scrap'>('raw');

  return (
    <Drawer open={!!name} onClose={onClose} title={LABELS.drawer.bomDetails}>
      {!name ? null : isLoading ? (
        <LoadingState />
      ) : !bom ? (
        <ErrorState message="BOM not found" />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-bold text-slate-100">{bom.name}</p>
              <p className="text-sm text-slate-400">{bom.item_name || bom.item}</p>
            </div>
            {bom.is_default ? (
              <StatusPill status="Completed">Default</StatusPill>
            ) : null}
          </div>

          {/* Cost summary */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-3">
              {LABELS.drawer.costSummary}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Raw Material', value: bom.raw_material_cost },
                { label: 'Operating Cost', value: bom.operating_cost },
                { label: 'Scrap Value', value: bom.scrap_material_cost },
                { label: 'Total Cost', value: bom.total_cost },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-lg bg-brand-800/50">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-slate-100">{formatINR(value)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div>
            <div className="flex gap-1 mb-3 bg-brand-800/50 rounded-lg p-1">
              {(['raw', 'ops', 'scrap'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'raw' ? LABELS.drawer.rawMaterials : tab === 'ops' ? LABELS.drawer.operations : LABELS.drawer.scrapItems}
                </button>
              ))}
            </div>

            {activeTab === 'raw' && (
              <div className="space-y-1.5">
                {!bom.items?.length ? (
                  <p className="text-xs text-slate-500 italic">{LABELS.empty.bomRaw}</p>
                ) : bom.items.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-brand-800/40 grid grid-cols-3 gap-2 text-xs">
                    <div className="col-span-2">
                      <p className="font-medium text-slate-200">{item.item_name || item.item_code}</p>
                      <p className="text-slate-500">{item.item_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-300">{formatQty(item.qty)} {item.uom}</p>
                      <p className="text-slate-500">{formatINR(item.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'ops' && (
              <div className="space-y-1.5">
                {!bom.operations?.length ? (
                  <p className="text-xs text-slate-500 italic">{LABELS.empty.bomOps}</p>
                ) : bom.operations.map((op, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-brand-800/40 text-xs">
                    <div className="flex justify-between mb-1">
                      <p className="font-medium text-slate-200">{op.operation}</p>
                      <p className="text-slate-400">{op.time_in_mins} min</p>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>{op.workstation}</span>
                      <span>{formatINR(op.hour_rate)}/hr</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'scrap' && (
              <div className="space-y-1.5">
                {!bom.scrap_items?.length ? (
                  <p className="text-xs text-slate-500 italic">{LABELS.empty.bomScrap}</p>
                ) : bom.scrap_items.map((s, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-brand-800/40 grid grid-cols-3 gap-2 text-xs">
                    <div className="col-span-2">
                      <p className="font-medium text-slate-200">{s.item_name || s.item_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-300">{formatQty(s.stock_qty)}</p>
                      <p className="text-slate-500">{formatINR(s.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            to={`/bom/${encodeURIComponent(name)}`}
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

export function BOMView() {
  const [drawerName, setDrawerName] = useState<string | null>(null);

  const { data: boms, isLoading, error } = useFrappeGetDocList<BOMRow>('BOM', {
    fields: ['name', 'item', 'item_name', 'quantity', 'uom', 'total_cost', 'is_default', 'with_operations'],
    filters: [['docstatus', '=', 1], ['is_active', '=', 1]],
    limit: 100,
    orderBy: { field: 'item_name', order: 'asc' },
  });

  const columns = useMemo(() => [
    {
      key: 'name',
      header: LABELS.columns.bom.id,
      render: (row: BOMRow) => (
        <span className="font-mono text-xs text-brand-300">{row.name}</span>
      ),
    },
    {
      key: 'item_name',
      header: LABELS.columns.bom.item,
      render: (row: BOMRow) => (
        <div>
          <p className="text-sm font-medium text-slate-100">{row.item_name || row.item}</p>
          <p className="text-[10px] text-slate-500">{row.item}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: LABELS.columns.bom.quantity,
      render: (row: BOMRow) => (
        <span className="text-sm">{formatQty(row.quantity)} {row.uom}</span>
      ),
    },
    {
      key: 'total_cost',
      header: LABELS.columns.bom.totalCost,
      render: (row: BOMRow) => (
        <span className="text-sm font-semibold text-emerald-400">{formatINR(row.total_cost)}</span>
      ),
    },
    {
      key: 'is_default',
      header: LABELS.columns.bom.isDefault,
      render: (row: BOMRow) =>
        row.is_default ? (
          <StatusPill status="Completed">Default</StatusPill>
        ) : (
          <span className="text-xs text-slate-500">—</span>
        ),
    },
    {
      key: 'with_operations',
      header: LABELS.columns.bom.withOperations,
      render: (row: BOMRow) => (
        <span className={`text-xs ${row.with_operations ? 'text-emerald-400' : 'text-slate-500'}`}>
          {row.with_operations ? 'Yes' : 'No'}
        </span>
      ),
    },
  ], []);

  return (
    <AppShell title={LABELS.nav.bom}>
      {(search) => {
        const filtered = (boms ?? []).filter((b) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return b.name.toLowerCase().includes(q) || b.item_name?.toLowerCase().includes(q) || b.item.toLowerCase().includes(q);
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
                <EmptyState message={LABELS.empty.bom} />
              ) : (
                <DataTable
                  columns={columns as unknown as Parameters<typeof DataTable>[0]['columns']}
                  data={filtered as unknown as Record<string, unknown>[]}
                  onRowClick={(row) => setDrawerName(row['name'] as string)}
                />
              )}
            </div>

            <BOMDrawer name={drawerName} onClose={() => setDrawerName(null)} />
          </>
        );
      }}
    </AppShell>
  );
}
