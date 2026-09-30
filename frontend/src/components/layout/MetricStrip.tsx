import { useFrappeGetCall } from 'frappe-react-sdk';
import { ClipboardList, Briefcase, AlertTriangle, CheckCircle } from 'lucide-react';
import { LABELS } from '@/constants/labels';

// Stock Projected Qty report response shape (partial)
interface StockProjectedRow {
  actual_qty?: number;
  reorder_level?: number;
}

interface CountResponse {
  message: number;
}

interface ReportResponse {
  message: {
    result?: StockProjectedRow[];
  };
}

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tileClass: string;
  isAlert?: boolean;
  isLoading?: boolean;
}

function MetricCard({ label, value, icon, tileClass, isAlert, isLoading }: MetricCardProps) {
  return (
    <div className={`card p-5 flex items-center gap-4 animate-fade-in ${isAlert ? 'border-l-4 border-l-[var(--red-600)]' : 'border-l-4 border-l-[var(--navy-600)]'}`}>
      <div className={tileClass}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
        {isLoading ? (
          <div className="w-16 h-8 bg-card2 rounded animate-pulse" />
        ) : (
          <p className="kpi-number">{value}</p>
        )}
      </div>
    </div>
  );
}

interface MetricStripProps {
  refreshKey?: number;
}

export function MetricStrip({ refreshKey }: MetricStripProps) {
  const swrKey = refreshKey !== undefined ? `metrics-${refreshKey}` : undefined;

  const { data: activeWO, isLoading: l1 } = useFrappeGetCall<CountResponse>(
    'frappe.client.get_count',
    {
      doctype: 'Work Order',
      filters: JSON.stringify([
        ['docstatus', '=', 1],
        ['status', 'in', ['Not Started', 'In Process']],
      ]),
    },
    swrKey ? `${swrKey}-active-wo` : undefined,
    { refreshInterval: 60000 },
  );

  const { data: openJC, isLoading: l2 } = useFrappeGetCall<CountResponse>(
    'frappe.client.get_count',
    {
      doctype: 'Job Card',
      filters: JSON.stringify([
        ['docstatus', '=', 1],
        ['status', '=', 'Open'],
      ]),
    },
    swrKey ? `${swrKey}-open-jc` : undefined,
    { refreshInterval: 60000 },
  );

  const { data: completedWO, isLoading: l4 } = useFrappeGetCall<CountResponse>(
    'frappe.client.get_count',
    {
      doctype: 'Work Order',
      filters: JSON.stringify([
        ['docstatus', '=', 1],
        ['status', '=', 'Completed'],
      ]),
    },
    swrKey ? `${swrKey}-completed-wo` : undefined,
    { refreshInterval: 60000 },
  );

  // Stock alerts: items where actual_qty <= reorder_level
  const { data: projectedData, isLoading: l3 } = useFrappeGetCall<ReportResponse>(
    'frappe.desk.query_report.run',
    {
      report_name: 'Stock Projected Qty',
      filters: JSON.stringify({}),
    },
    swrKey ? `${swrKey}-stock-projected` : undefined,
    { refreshInterval: 60000 },
  );

  const stockRows = projectedData?.message?.result ?? [];
  const stockAlerts = stockRows.filter(
    (r) =>
      r.reorder_level !== undefined &&
      r.reorder_level !== null &&
      r.actual_qty !== undefined &&
      r.actual_qty !== null &&
      r.actual_qty <= r.reorder_level,
  ).length ?? 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <MetricCard
        label={LABELS.metrics.activeWorkOrders}
        value={activeWO?.message ?? 0}
        icon={<ClipboardList size={20} />}
        tileClass="kpi-tile-navy"
        isLoading={l1}
      />
      <MetricCard
        label={LABELS.metrics.openJobCards}
        value={openJC?.message ?? 0}
        icon={<Briefcase size={20} />}
        tileClass="kpi-tile-navy-tint"
        isLoading={l2}
      />
      <MetricCard
        label={LABELS.metrics.stockAlerts}
        value={stockAlerts}
        icon={<AlertTriangle size={20} />}
        tileClass="kpi-tile-red"
        isAlert={stockAlerts > 0}
        isLoading={l3}
      />
      <MetricCard
        label={LABELS.metrics.completedBatches}
        value={completedWO?.message ?? 0}
        icon={<CheckCircle size={20} />}
        tileClass="kpi-tile-green"
        isLoading={l4}
      />
    </div>
  );
}
