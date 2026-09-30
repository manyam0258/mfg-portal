import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { AppShell } from '@/components/layout/AppShell';
import { ReportViewer, type ReportFilters } from '@/components/reports/ReportViewer';
import { LABELS } from '@/constants/labels';

export function StockProjectedQtyView() {
  const [searchParams] = useSearchParams();

  const { data: companies } = useFrappeGetDocList<{ name: string }>(
    'Company',
    { fields: ['name'], limit: 10 },
    'companies-list',
  );

  const defaultCompany = companies?.[0]?.name || 'Tridasa';

  const [company, setCompany] = useState<string>(searchParams.get('company') || defaultCompany);
  const [itemGroup, setItemGroup] = useState<string>('');
  const [itemCode, setItemCode] = useState<string>('');

  const activeFilters = useMemo((): ReportFilters => {
    const f: ReportFilters = {
      company: company || defaultCompany,
    };
    if (itemGroup) f.item_group = itemGroup;
    if (itemCode) f.item_code = itemCode;
    return f;
  }, [company, defaultCompany, itemGroup, itemCode]);

  return (
    <AppShell title={LABELS.reportLabels.stockProjected}>
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
                <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Item Code</label>
                <input
                  type="text"
                  placeholder="Optional item code…"
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  className="input-field text-xs h-9"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Item Group</label>
                <input
                  type="text"
                  placeholder="Optional item group…"
                  value={itemGroup}
                  onChange={(e) => setItemGroup(e.target.value)}
                  className="input-field text-xs h-9"
                />
              </div>
            </div>
          </div>

          <ReportViewer
            reportName="Stock Projected Qty"
            filters={activeFilters}
          />
        </div>
      )}
    </AppShell>
  );
}
