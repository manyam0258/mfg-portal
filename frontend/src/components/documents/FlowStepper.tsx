import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { Check, Clock, Circle, ArrowRight } from 'lucide-react';
import { formatINR } from '@/lib/format';

export interface FlowStepperProps {
  currentDocType: 'Work Order' | 'Delivery Note' | 'Sales Invoice';
  currentDocName: string;
  postingDate?: string;
  workOrderName?: string;
  salesOrderName?: string;
  deliveryNoteName?: string;
  salesInvoiceName?: string;
}

interface StepItem {
  id: string;
  label: string;
  status: 'done' | 'in_progress' | 'pending';
  subtext?: string;
  to?: string;
}

export function FlowStepper({
  currentDocType,
  currentDocName,
  postingDate,
  workOrderName,
  salesOrderName,
  deliveryNoteName,
  salesInvoiceName,
}: FlowStepperProps) {
  const navigate = useNavigate();

  // 1. If we are on Work Order, resolve WO name
  const effectiveWO = currentDocType === 'Work Order' ? currentDocName : workOrderName;

  // Query Stock Entries linked to WO
  const { data: stockEntries } = useFrappeGetDocList<{ name: string; stock_entry_type: string; docstatus: number; total_incoming_value: number; posting_date: string }>(
    'Stock Entry',
    {
      fields: ['name', 'stock_entry_type', 'docstatus', 'total_incoming_value', 'posting_date'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filters: effectiveWO ? ([['work_order', '=', effectiveWO], ['docstatus', '!=', 2]] as any) : undefined,
      limit: 20,
    },
    effectiveWO ? `flow-se-${effectiveWO}` : null,
  );

  // Query Job Cards linked to WO
  const { data: jobCards } = useFrappeGetDocList<{ name: string; status: string; docstatus: number }>(
    'Job Card',
    {
      fields: ['name', 'status', 'docstatus'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filters: effectiveWO ? ([['work_order', '=', effectiveWO], ['docstatus', '!=', 2]] as any) : undefined,
      limit: 20,
    },
    effectiveWO ? `flow-jc-${effectiveWO}` : null,
  );

  // Query Delivery Notes (by name or linked)
  const effectiveDN = currentDocType === 'Delivery Note' ? currentDocName : deliveryNoteName;
  const dnFilter = effectiveDN
    ? [['name', '=', effectiveDN]]
    : salesOrderName
    ? [['against_sales_order', '=', salesOrderName]]
    : undefined;

  const { data: dnList } = useFrappeGetDocList<{ name: string; docstatus: number; grand_total: number; posting_date: string }>(
    'Delivery Note',
    {
      fields: ['name', 'docstatus', 'grand_total', 'posting_date'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filters: dnFilter as any,
      limit: 1,
    },
    effectiveDN || salesOrderName ? `flow-dn-${effectiveDN || salesOrderName}` : null,
  );

  // Query Sales Invoice (by name or linked)
  const effectiveSI = currentDocType === 'Sales Invoice' ? currentDocName : salesInvoiceName;
  const { data: siList } = useFrappeGetDocList<{ name: string; docstatus: number; grand_total: number; outstanding_amount: number; posting_date: string }>(
    'Sales Invoice',
    {
      fields: ['name', 'docstatus', 'grand_total', 'outstanding_amount', 'posting_date'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filters: effectiveSI ? ([['name', '=', effectiveSI]] as any) : undefined,
      limit: 1,
    },
    effectiveSI ? `flow-si-${effectiveSI}` : null,
  );

  // Query Payment Entry references for SI
  const targetSIName = effectiveSI || siList?.[0]?.name;
  const { data: peRefs } = useFrappeGetDocList<{ parent: string; allocated_amount: number }>(
    'Payment Entry Reference',
    {
      fields: ['parent', 'allocated_amount'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filters: targetSIName ? ([['reference_name', '=', targetSIName], ['docstatus', '=', 1]] as any) : undefined,
      limit: 5,
    },
    targetSIName ? `flow-pe-${targetSIName}` : null,
  );

  // Breakdown Stock Entries into Material Transfer & Manufacture
  const transferSE = (stockEntries ?? []).filter((s) => s.stock_entry_type === 'Material Transfer for Manufacture');
  const mfgSE = (stockEntries ?? []).filter((s) => s.stock_entry_type === 'Manufacture');

  const steps = useMemo((): StepItem[] => {
    // 1. Work Order
    const woDone = effectiveWO ? true : false;
    const woStep: StepItem = {
      id: 'wo',
      label: 'Work Order',
      status: woDone ? 'done' : 'pending',
      subtext: effectiveWO ? effectiveWO : 'Not linked',
      to: effectiveWO ? `/work-orders/${encodeURIComponent(effectiveWO)}` : undefined,
    };

    // 2. Material Transfer
    const hasTransferSubmitted = transferSE.some((s) => s.docstatus === 1);
    const hasTransferDraft = transferSE.some((s) => s.docstatus === 0);
    const transferFirst = transferSE[0];
    const transferStep: StepItem = {
      id: 'transfer',
      label: 'Material Transfer',
      status: hasTransferSubmitted ? 'done' : hasTransferDraft ? 'in_progress' : 'pending',
      subtext: transferFirst ? `${transferSE.length} Entry` : 'Pending',
      to: transferFirst ? `/stock-entries/${encodeURIComponent(transferFirst.name)}` : undefined,
    };

    // 3. Job Card
    const totalJC = jobCards?.length ?? 0;
    const completedJC = (jobCards ?? []).filter((j) => j.status === 'Completed').length;
    const jcDone = totalJC > 0 && completedJC === totalJC;
    const jcInProgress = (jobCards ?? []).some((j) => j.status === 'Work In Progress');
    const jcFirst = jobCards?.[0];
    const jcStep: StepItem = {
      id: 'job_card',
      label: 'Job Card',
      status: jcDone ? 'done' : jcInProgress || totalJC > 0 ? 'in_progress' : 'pending',
      subtext: totalJC > 0 ? `${completedJC}/${totalJC} Done` : 'Pending',
      to: jcFirst ? `/job-cards/${encodeURIComponent(jcFirst.name)}` : '/job-cards',
    };

    // 4. Manufacture
    const hasMfgSubmitted = mfgSE.some((s) => s.docstatus === 1);
    const hasMfgDraft = mfgSE.some((s) => s.docstatus === 0);
    const mfgFirst = mfgSE[0];
    const mfgStep: StepItem = {
      id: 'manufacture',
      label: 'Manufacture',
      status: hasMfgSubmitted ? 'done' : hasMfgDraft ? 'in_progress' : 'pending',
      subtext: mfgFirst ? (hasMfgSubmitted ? 'Completed' : 'Draft') : 'Pending',
      to: mfgFirst ? `/stock-entries/${encodeURIComponent(mfgFirst.name)}` : undefined,
    };

    // 5. Delivery Note
    const dnDoc = dnList?.[0];
    const dnDone = dnDoc?.docstatus === 1;
    const dnStep: StepItem = {
      id: 'dn',
      label: 'Delivery Note',
      status: dnDone ? 'done' : dnDoc ? 'in_progress' : 'pending',
      subtext: dnDoc ? dnDoc.name : 'Pending',
      to: dnDoc ? `/delivery-notes/${encodeURIComponent(dnDoc.name)}` : undefined,
    };

    // 6. Sales Invoice
    const siDoc = siList?.[0];
    const siDone = siDoc?.docstatus === 1;
    const siStep: StepItem = {
      id: 'si',
      label: 'Sales Invoice',
      status: siDone ? 'done' : siDoc ? 'in_progress' : 'pending',
      subtext: siDoc ? `${siDoc.name} · ${formatINR(siDoc.grand_total)}` : 'Pending',
      to: siDoc ? `/sales-invoices/${encodeURIComponent(siDoc.name)}` : undefined,
    };

    // 7. Payment Entry
    const peDoc = peRefs?.[0];
    const pePaid = !!peDoc || (siDoc && siDoc.docstatus === 1 && (siDoc.outstanding_amount ?? 0) <= 0);
    const peStep: StepItem = {
      id: 'pe',
      label: 'Payment Entry',
      status: pePaid ? 'done' : siDoc?.docstatus === 1 ? 'in_progress' : 'pending',
      subtext: peDoc ? `${peDoc.parent} · ${formatINR(peDoc.allocated_amount)}` : pePaid ? 'Paid' : 'Unpaid',
      to: peDoc ? `/payments/${encodeURIComponent(peDoc.parent)}` : undefined,
    };

    // 8. Profit & Loss
    const pDate = postingDate || siDoc?.posting_date || dnDoc?.posting_date || stockEntries?.[0]?.posting_date;
    const pDateFilter = pDate ? `?from_date=${pDate}&to_date=${pDate}&filter_based_on=Date+Range` : '';
    const plStep: StepItem = {
      id: 'pl',
      label: 'Profit & Loss',
      status: (dnDone || siDone) ? 'done' : 'pending',
      subtext: 'View Statement',
      to: `/reports/profit-and-loss${pDateFilter}`,
    };

    return [woStep, transferStep, jcStep, mfgStep, dnStep, siStep, peStep, plStep];
  }, [effectiveWO, transferSE, jobCards, mfgSE, dnList, siList, peRefs, postingDate, stockEntries]);

  return (
    <div className="card p-4 mb-4 overflow-x-auto">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-xs font-semibold text-fg uppercase tracking-wider">Production-to-P&L Flow Tracker</h3>
        <span className="text-[10px] text-muted">Click any step to open in-portal</span>
      </div>
      <div className="flex items-center min-w-[760px] relative">
        {steps.map((step, idx) => {
          const isCurrent = (
            (currentDocType === 'Work Order' && step.id === 'wo') ||
            (currentDocType === 'Delivery Note' && step.id === 'dn') ||
            (currentDocType === 'Sales Invoice' && step.id === 'si')
          );
          const isDone = step.status === 'done';
          const isInProgress = step.status === 'in_progress';

          return (
            <div key={step.id} className="flex-1 flex items-center">
              <button
                type="button"
                onClick={() => step.to && navigate(step.to)}
                disabled={!step.to}
                className={`flex flex-col items-center text-center p-2 rounded-xl transition-all w-full group ${
                  step.to ? 'hover:bg-hover cursor-pointer' : 'cursor-default opacity-60'
                } ${isCurrent ? 'ring-2 ring-primary bg-hover' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 transition-colors ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : isInProgress
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                      : 'bg-card border border-line text-muted'
                  }`}
                >
                  {isDone ? <Check size={14} /> : isInProgress ? <Clock size={14} /> : <Circle size={10} />}
                </div>
                <span className={`text-[11px] font-medium leading-tight truncate w-full ${isCurrent ? 'text-primary font-bold' : 'text-fg'}`}>
                  {step.label}
                </span>
                <span className="text-[9px] text-muted truncate w-full mt-0.5">
                  {step.subtext}
                </span>
              </button>
              {idx < steps.length - 1 && (
                <div className="text-muted/30 px-1 flex-shrink-0">
                  <ArrowRight size={13} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
