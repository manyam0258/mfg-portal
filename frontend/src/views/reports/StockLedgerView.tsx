import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { AppShell } from '@/components/layout/AppShell';
import { ReportViewer, type ReportFilters } from '@/components/reports/ReportViewer';
import { LABELS } from '@/constants/labels';

export function StockLedgerView() {
  const [searchParams] = useSearchParams();

  const { data: companies } = useFrappeGetDocList<{ name: string }>(
    'Company',
    { fields: ['name'], limit: 10 },
    'companies-list',
  );

  const defaultCompany = companies?.[0]?.name || 'Tridasa';

  const [company, setCompany] = useState<string>(searchParams.get('company') || defaultCompany);
  const [itemCode, setItemCode] = useState<string>(searchParams.get('item_code') || '');
  const [warehouse, setWarehouse] = useState<string>(searchParams.get('warehouse') || '');
  const [voucherNo, setVoucherNo] = useState<string>(searchParams.get('voucher_no') || '');
  const [fromDate, setFromDate] = useState<string>(searchParams.get('from_date') || '2026-09-01');
  const [toDate, setToDate] = useState<string>(searchParams.get('to_date') || '2026-09-30');

  const activeFilters = useMemo((): ReportFilters => {
    const f: ReportFilters = {
      company: company || defaultCompany,
      from_date: fromDate,
      to_date: toDate,
    };
    if (itemCode) f.item_code = itemCode;
    if (warehouse) f.warehouse = warehouse;
    if (voucherNo) f.voucher_no = voucherNo;
    return f;
  }, [company, defaultCompany, fromDate, toDate, itemCode, warehouse, voucherNo]);

  return (
    <AppShell title={LABELS.reportLabels.stockLedger}>
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
                <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Item Code</label>
                <input
                  type="text"
                  placeholder="e.g. Idly Batter"
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  className="input-field text-xs h-9"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Warehouse</label>
                <input
                  type="text"
                  placeholder="e.g. Stores - T"
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                  className="input-field text-xs h-9"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Voucher No</label>
                <input
                  type="text"
                  placeholder="e.g. MAT-STE-00009"
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
            </div>
          </div>

          <ReportViewer
            reportName="Stock Ledger"
            filters={activeFilters}
          />
        </div>
      )}
    </AppShell>
  );
}
