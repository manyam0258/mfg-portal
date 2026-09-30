import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { AppShell } from '@/components/layout/AppShell';
import { ReportViewer, type ReportFilters } from '@/components/reports/ReportViewer';
import { LABELS } from '@/constants/labels';

export function StockBalanceView() {
  const [searchParams] = useSearchParams();

  const { data: companies } = useFrappeGetDocList<{ name: string }>(
    'Company',
    { fields: ['name'], limit: 10 },
    'companies-list',
  );

  const defaultCompany = companies?.[0]?.name || 'Tridasa';

  const [company, setCompany] = useState<string>(searchParams.get('company') || defaultCompany);
  const [fromDate, setFromDate] = useState<string>(searchParams.get('from_date') || '2026-09-01');
  const [toDate, setToDate] = useState<string>(searchParams.get('to_date') || '2026-09-30');
  const [warehouse, setWarehouse] = useState<string>(searchParams.get('warehouse') || '');

  const activeFilters = useMemo((): ReportFilters => {
    const f: ReportFilters = {
      company: company || defaultCompany,
      from_date: fromDate,
      to_date: toDate,
    };
    if (warehouse) f.warehouse = warehouse;
    return f;
  }, [company, defaultCompany, fromDate, toDate, warehouse]);

  return (
    <AppShell title={LABELS.reportLabels.stockBalance}>
      {() => (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Company</label>
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="input-field text-xs h-9"
                >
                  {(companies ?? [{ name: 'Tridasa' }]).map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Warehouse</label>
                <input
                  type="text"
                  placeholder="Optional warehouse…"
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                  className="input-field text-xs h-9"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted uppercase font-semibold block mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="input-field text-xs h-9"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted uppercase font-semibold block mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="input-field text-xs h-9"
                />
              </div>
            </div>
          </div>

          <ReportViewer
            reportName="Stock Balance"
            filters={activeFilters}
          />
        </div>
      )}
    </AppShell>
  );
}
