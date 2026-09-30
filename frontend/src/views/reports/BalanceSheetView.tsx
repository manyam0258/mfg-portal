import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { AppShell } from '@/components/layout/AppShell';
import { ReportViewer, type ReportRow, type ReportColumn, type ReportFilters } from '@/components/reports/ReportViewer';
import { LABELS } from '@/constants/labels';

export function BalanceSheetView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { data: companies } = useFrappeGetDocList<{ name: string }>(
    'Company',
    { fields: ['name'], limit: 10 },
    'companies-list',
  );

  const defaultCompany = companies?.[0]?.name || 'Tridasa';

  const [company, setCompany] = useState<string>(searchParams.get('company') || defaultCompany);
  const [periodicity, setPeriodicity] = useState<string>('Yearly');
  const [costCenter, setCostCenter] = useState<string>('');

  const activeFilters = useMemo((): ReportFilters => ({
    company: company || defaultCompany,
    period_start_date: '2026-04-01',
    period_end_date: '2027-03-31',
    periodicity,
    cost_center: costCenter || null,
  }), [company, defaultCompany, periodicity, costCenter]);

  const handleDrillDown = (row: ReportRow, _col: ReportColumn) => {
    const account = row.account as string;
    if (!account) return;
    navigate(`/reports/general-ledger?company=${encodeURIComponent(company || defaultCompany)}&account=${encodeURIComponent(account)}`);
  };

  return (
    <AppShell title={LABELS.reportLabels.balanceSheet}>
      {() => (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
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
                <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Periodicity</label>
                <select
                  value={periodicity}
                  onChange={(e) => setPeriodicity(e.target.value)}
                  className="input-field text-xs h-9"
                >
                  <option value="Yearly">Yearly</option>
                  <option value="Half-Yearly">Half-Yearly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Cost Center</label>
                <input
                  type="text"
                  placeholder="Optional cost center…"
                  value={costCenter}
                  onChange={(e) => setCostCenter(e.target.value)}
                  className="input-field text-xs h-9"
                />
              </div>
            </div>
          </div>

          <ReportViewer
            reportName="Balance Sheet"
            filters={activeFilters}
            tree={true}
            onDrillDown={handleDrillDown}
          />
        </div>
      )}
    </AppShell>
  );
}
