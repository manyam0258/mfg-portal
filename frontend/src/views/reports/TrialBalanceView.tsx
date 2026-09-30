import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { AppShell } from '@/components/layout/AppShell';
import { ReportViewer, type ReportRow, type ReportColumn, type ReportFilters } from '@/components/reports/ReportViewer';
import { LABELS } from '@/constants/labels';

export function TrialBalanceView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { data: companies } = useFrappeGetDocList<{ name: string }>(
    'Company',
    { fields: ['name'], limit: 10 },
    'companies-list',
  );

  const defaultCompany = companies?.[0]?.name || 'Tridasa';

  const [company, setCompany] = useState<string>(searchParams.get('company') || defaultCompany);
  const [fromDate, setFromDate] = useState<string>(searchParams.get('from_date') || '2026-04-01');
  const [toDate, setToDate] = useState<string>(searchParams.get('to_date') || '2027-03-31');

  const activeFilters = useMemo((): ReportFilters => ({
    company: company || defaultCompany,
    from_date: fromDate,
    to_date: toDate,
    fiscal_year: '2026-2027',
  }), [company, defaultCompany, fromDate, toDate]);

  const handleDrillDown = (row: ReportRow, _col: ReportColumn) => {
    const account = row.account as string;
    if (!account) return;
    navigate(`/reports/general-ledger?company=${encodeURIComponent(company || defaultCompany)}&account=${encodeURIComponent(account)}`);
  };

  return (
    <AppShell title={LABELS.reportLabels.trialBalance}>
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
            reportName="Trial Balance"
            filters={activeFilters}
            tree={true}
            onDrillDown={handleDrillDown}
          />
        </div>
      )}
    </AppShell>
  );
}
