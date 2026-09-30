import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { ExternalLink } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { MetricStrip } from '@/components/layout/MetricStrip';
import { DataTable } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/EmptyState';
import { LABELS } from '@/constants/labels';
import { minsToHours } from '@/lib/format';

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobCardRow {
  name: string;
  work_order: string;
  production_item: string;
  workstation: string;
  operation: string;
  time_required: number;
  for_quantity: number;
  total_time_in_mins: number;
  status: string;
}

type TabFilter = 'all' | 'Open' | 'Work In Progress' | 'Completed';

const TAB_LABELS: Record<TabFilter, string> = {
  all: 'All',
  Open: LABELS.status.open,
  'Work In Progress': LABELS.status.workInProgress,
  Completed: LABELS.status.completed,
};

// ─── Main View ────────────────────────────────────────────────────────────────

export function JobCardView() {
  const [tab, setTab] = useState<TabFilter>('all');

  const filters = useMemo(() => {
    const f: [string, string, unknown][] = [['docstatus', '<', 2]];
    if (tab !== 'all') f.push(['status', '=', tab]);
    return f;
  }, [tab]);

  const { data: jobCards, isLoading, error } = useFrappeGetDocList<JobCardRow>('Job Card', {
    fields: [
      'name', 'work_order', 'production_item', 'workstation',
      'operation', 'time_required', 'for_quantity', 'total_time_in_mins', 'status',
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filters: filters as any,
    limit: 100,
    orderBy: { field: 'creation', order: 'desc' },
  }, `job-cards-${tab}`);

  const columns = useMemo(() => [
    {
      key: 'name',
      header: LABELS.columns.jobCard.id,
      render: (row: JobCardRow) => (
        <Link
          to={`/job-cards/${encodeURIComponent(row.name)}`}
          onClick={(e) => e.stopPropagation()}
          className="font-mono text-xs font-semibold hover:underline flex items-center gap-1"
          style={{ color: 'var(--table-link)' }}
        >
          {row.name}
          <ExternalLink size={10} />
        </Link>
      ),
    },
    {
      key: 'work_order',
      header: LABELS.columns.jobCard.workOrder,
      render: (row: JobCardRow) => (
        <Link
          to={`/work-orders/${encodeURIComponent(row.work_order)}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-mono hover:underline"
          style={{ color: 'var(--table-link)' }}
        >
          {row.work_order}
        </Link>
      ),
    },
    {
      key: 'production_item',
      header: LABELS.columns.jobCard.item,
      render: (row: JobCardRow) => <span className="text-sm">{row.production_item}</span>,
    },
    {
      key: 'workstation',
      header: LABELS.columns.jobCard.workstation,
      render: (row: JobCardRow) => <span className="text-xs text-slate-400">{row.workstation || '—'}</span>,
    },
    {
      key: 'operation',
      header: LABELS.columns.jobCard.operation,
      render: (row: JobCardRow) => <span className="text-xs text-slate-300">{row.operation || '—'}</span>,
    },
    {
      key: 'time_required',
      header: LABELS.columns.jobCard.requiredTime,
      render: (row: JobCardRow) => (
        <span className="text-xs text-slate-300">{minsToHours((row.time_required ?? 0) * 60)}</span>
      ),
    },
    {
      key: 'total_time_in_mins',
      header: LABELS.columns.jobCard.actualTime,
      render: (row: JobCardRow) => (
        <span className="text-xs text-slate-300">{row.total_time_in_mins ? `${row.total_time_in_mins} min` : '—'}</span>
      ),
    },
    {
      key: 'status',
      header: LABELS.columns.jobCard.status,
      render: (row: JobCardRow) => <StatusPill status={row.status} />,
    },
  ], []);

  return (
    <AppShell title={LABELS.nav.jobCards}>
      {(search) => {
        const filtered = (jobCards ?? []).filter((jc) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return (
            jc.name.toLowerCase().includes(q) ||
            jc.work_order?.toLowerCase().includes(q) ||
            jc.production_item?.toLowerCase().includes(q) ||
            jc.operation?.toLowerCase().includes(q)
          );
        });

        return (
          <>
            <MetricStrip />

            {/* Tab filter bar */}
            <div className="flex gap-1 mb-4 bg-card2 rounded-xl p-1 w-fit border border-line">
              {(Object.keys(TAB_LABELS) as TabFilter[]).map((t) => (
                <button
                  key={t}
                  id={`jc-tab-${t}`}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    tab === t
                      ? 'bg-[var(--navy-600)] text-white shadow-sm'
                      : 'text-muted hover:text-fg'
                  }`}
                >
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>

            <div className="card">
              {isLoading ? (
                <LoadingState />
              ) : error ? (
                <ErrorState message={String(error)} />
              ) : !filtered.length ? (
                <EmptyState message={LABELS.empty.jobCards} />
              ) : (
                <DataTable
                  columns={columns as unknown as Parameters<typeof DataTable>[0]['columns']}
                  data={filtered as unknown as Record<string, unknown>[]}
                />
              )}
            </div>

            {/* Note about shop-floor actions */}
            <div className="mt-4 p-4 rounded-xl bg-card border border-line text-xs text-muted">
              <p>
                Shop-floor actions (Start, Pause, Complete) use{' '}
                <code className="text-primary">erpnext.manufacturing.doctype.job_card.job_card.make_time_log</code>.
                Click any Job Card ID above to open its full document page with live timers and tracking.
              </p>
            </div>
          </>
        );
      }}
    </AppShell>
  );
}
