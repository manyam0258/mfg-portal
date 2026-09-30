import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { AppShell } from '@/components/layout/AppShell';
import { ReportViewer, type ReportRow, type ReportColumn, type ReportFilters } from '@/components/reports/ReportViewer';
import { LABELS } from '@/constants/labels';

export function ProfitAndLossView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Query available companies
  const { data: companies } = useFrappeGetDocList<{ name: string }>(
    'Company',
    { fields: ['name'], limit: 10 },
    'companies-list',
  );

  const defaultCompany = companies?.[0]?.name || 'Tridasa';

  // Filters state
  const [company, setCompany] = useState<string>(searchParams.get('company') || defaultCompany);
  const [filterBasedOn, setFilterBasedOn] = useState<'Date Range' | 'Fiscal Year'>(
    (searchParams.get('filter_based_on') as 'Date Range' | 'Fiscal Year') || 'Date Range',
  );
  const [fromDate, setFromDate] = useState<string>(
    searchParams.get('from_date') || searchParams.get('period_start_date') || '2026-09-01',
  );
  const [toDate, setToDate] = useState<string>(
    searchParams.get('to_date') || searchParams.get('period_end_date') || '2026-09-30',
  );
  const [periodicity, setPeriodicity] = useState<string>('Monthly');
  const [costCenter, setCostCenter] = useState<string>('');
  const [project, setProject] = useState<string>('');
  const [accumulatedValues, setAccumulatedValues] = useState<boolean>(false);
  const [comparePrev, setComparePrev] = useState<boolean>(false);

  // Active filters passed to ReportViewer
  const activeFilters = useMemo((): ReportFilters => {
    const f: ReportFilters = {
      company: company || defaultCompany,
      filter_based_on: filterBasedOn,
      periodicity,
    };
    if (filterBasedOn === 'Date Range') {
      f.period_start_date = fromDate;
      f.period_end_date = toDate;
    } else {
      f.from_fiscal_year = '2026-2027';
      f.to_fiscal_year = '2026-2027';
    }
    if (costCenter) f.cost_center = costCenter;
    if (project) f.project = project;
    if (accumulatedValues) f.accumulated_values = 1;
    if (comparePrev) f.compare_with_previous = 1;
    return f;
  }, [company, defaultCompany, filterBasedOn, fromDate, toDate, periodicity, costCenter, project, accumulatedValues, comparePrev]);

  // Handle drill down to General Ledger
  const handleDrillDown = (row: ReportRow, _col: ReportColumn, _filters: ReportFilters) => {
    const account = row.account as string;
    if (!account) return;
    const params = new URLSearchParams({
      company: company || defaultCompany,
      account,
      from_date: fromDate,
      to_date: toDate,
    });
    if (costCenter) params.set('cost_center', costCenter);
    navigate(`/reports/general-ledger?${params.toString()}`);
  };

  return (
    <AppShell title={LABELS.reportLabels.profitLoss}>
      {() => (
        <div className="space-y-4">
          {/* Filters Bar */}
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
                <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Filter Based On</label>
                <select
                  value={filterBasedOn}
                  onChange={(e) => setFilterBasedOn(e.target.value as 'Date Range' | 'Fiscal Year')}
                  className="input-field text-xs h-9"
                >
                  <option value="Date Range">Date Range</option>
                  <option value="Fiscal Year">Fiscal Year</option>
                </select>
              </div>

              {filterBasedOn === 'Date Range' ? (
                <>
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
                </>
              ) : (
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Fiscal Year</label>
                  <input
                    type="text"
                    value="2026-2027"
                    disabled
                    className="input-field text-xs h-9 opacity-70"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Periodicity</label>
                <select
                  value={periodicity}
                  onChange={(e) => setPeriodicity(e.target.value)}
                  className="input-field text-xs h-9"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Half-Yearly">Half-Yearly</option>
                  <option value="Yearly">Yearly</option>
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

              <div>
                <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Project</label>
                <input
                  type="text"
                  placeholder="Optional project…"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="input-field text-xs h-9"
                />
              </div>

              <div className="flex items-center gap-4 lg:col-span-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-fg">
                  <input
                    type="checkbox"
                    checked={accumulatedValues}
                    onChange={(e) => setAccumulatedValues(e.target.checked)}
                    className="rounded bg-card border-line"
                  />
                  <span>Accumulated Values</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-fg">
                  <input
                    type="checkbox"
                    checked={comparePrev}
                    onChange={(e) => setComparePrev(e.target.checked)}
                    className="rounded bg-card border-line"
                  />
                  <span>Compare with Previous Period</span>
                </label>
              </div>
            </div>
          </div>

          {/* Report Viewer */}
          <ReportViewer
            reportName="Profit and Loss Statement"
            filters={activeFilters}
            tree={true}
            onDrillDown={handleDrillDown}
          />
        </div>
      )}
    </AppShell>
  );
}
