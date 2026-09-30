import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { AppShell } from '@/components/layout/AppShell';
import { ReportViewer, type ReportFilters } from '@/components/reports/ReportViewer';
import { LABELS } from '@/constants/labels';

export function GeneralLedgerView() {
  const [searchParams] = useSearchParams();

  const { data: companies } = useFrappeGetDocList<{ name: string }>(
    'Company',
    { fields: ['name'], limit: 10 },
    'companies-list',
  );

  const defaultCompany = companies?.[0]?.name || 'Tridasa';

  const [company, setCompany] = useState<string>(searchParams.get('company') || defaultCompany);
  const [account, setAccount] = useState<string>(searchParams.get('account') || '');
  const [fromDate, setFromDate] = useState<string>(searchParams.get('from_date') || '2026-09-01');
  const [toDate, setToDate] = useState<string>(searchParams.get('to_date') || '2026-09-30');
  const [voucherNo, setVoucherNo] = useState<string>(searchParams.get('voucher_no') || '');
  const [groupBy, setGroupBy] = useState<string>('Group by Voucher (Consolidated)');

  const activeFilters = useMemo((): ReportFilters => {
    const f: ReportFilters = {
      company: company || defaultCompany,
      from_date: fromDate,
      to_date: toDate,
      group_by: groupBy,
    };
    if (account) f.account = account;
    if (voucherNo) f.voucher_no = voucherNo;
    return f;
  }, [company, defaultCompany, fromDate, toDate, groupBy, account, voucherNo]);

  return (
    <AppShell title={LABELS.reportLabels.generalLedger}>
      {() => (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
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
                <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Account</label>
                <input
                  type="text"
                  placeholder="e.g. 5111 - Cost of Goods Sold - T"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="input-field text-xs h-9"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Voucher No</label>
                <input
                  type="text"
                  placeholder="e.g. DN-26-00001 or SINV-26-00001"
                  value={voucherNo}
                  onChange={(e) => setVoucherNo(e.target.value)}
                  className="input-field text-xs h-9 font-mono"
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

              <div>
                <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Group By</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="input-field text-xs h-9"
                >
                  <option value="Group by Voucher (Consolidated)">Group by Voucher (Consolidated)</option>
                  <option value="Group by Account">Group by Account</option>
                  <option value="">Do Not Group</option>
                </select>
              </div>
            </div>
          </div>

          <ReportViewer
            reportName="General Ledger"
            filters={activeFilters}
          />
        </div>
      )}
    </AppShell>
  );
}
