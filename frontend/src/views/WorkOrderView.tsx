import { useState, useCallback, useMemo, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { useFrappeGetDocList, useFrappeGetDoc, FrappeContext } from 'frappe-react-sdk';
import { Plus, ExternalLink, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppShell } from '@/components/layout/AppShell';
import { MetricStrip } from '@/components/layout/MetricStrip';
import { StatusPill } from '@/components/ui/StatusPill';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/EmptyState';
import { LABELS } from '@/constants/labels';
import { formatDate, formatQty } from '@/lib/format';
import { showFrappeError } from '@/lib/frappeError';
import { useDefaultBom } from '@/hooks/useDefaultBom';
import { useWarehouses, findWarehouse } from '@/hooks/useWarehouses';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkOrderRow {
  name: string;
  production_item: string;
  item_name: string;
  qty: number;
  produced_qty: number;
  wip_warehouse: string;
  status: string;
  creation: string;
}

// ─── New Work Order Modal ─────────────────────────────────────────────────────

interface NewWOModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function NewWorkOrderModal({ open, onClose, onCreated }: NewWOModalProps) {
  const frappe = useContext(FrappeContext);
  const { db, call } = frappe ?? {};

  // Step 1 fields
  const [selectedItem, setSelectedItem] = useState('');
  const [qty, setQty] = useState('');
  const [selectedBom, setSelectedBom] = useState('');

  // Step 2 warehouse fields
  const [wipWarehouse, setWipWarehouse] = useState('');
  const [fgWarehouse, setFgWarehouse] = useState('');
  const [scrapWarehouse, setScrapWarehouse] = useState('');
  const [sourceWarehouse, setSourceWarehouse] = useState('');

  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);

  // Load items from active submitted BOMs (distinct items)
  const { data: bomItems } = useFrappeGetDocList<{ item: string; item_name: string }>('BOM', {
    fields: ['item', 'item_name'],
    filters: [['docstatus', '=', 1 as unknown as string], ['is_active', '=', 1 as unknown as string]],
    groupBy: 'item',
    limit: 200,
    orderBy: { field: 'item_name', order: 'asc' },
  });

  const { data: boms, defaultBom } = useDefaultBom(selectedItem || undefined);
  const { data: warehouses } = useWarehouses();

  // When item changes, auto-select default BOM
  const handleItemChange = useCallback(
    (item: string) => {
      setSelectedItem(item);
      setSelectedBom('');
    },
    [],
  );

  // Keep selectedBom in sync with defaultBom
  useEffect(() => {
    if (defaultBom && !selectedBom) {
      setSelectedBom(defaultBom);
    }
  }, [defaultBom, selectedBom]);

  // Pre-set preferred warehouses when warehouses load
  useEffect(() => {
    if (!warehouses.length) return;
    if (!wipWarehouse) setWipWarehouse(findWarehouse(warehouses, 'Catering WIP - T') || warehouses[0]?.name || '');
    if (!fgWarehouse) setFgWarehouse(findWarehouse(warehouses, 'Catering Finished Goods - T') || warehouses[0]?.name || '');
    if (!scrapWarehouse) setScrapWarehouse(findWarehouse(warehouses, 'Catering Scrap - T') || warehouses[0]?.name || '');
    if (!sourceWarehouse) setSourceWarehouse(findWarehouse(warehouses, 'Catering Stores - T') || warehouses[0]?.name || '');
  }, [warehouses, wipWarehouse, fgWarehouse, scrapWarehouse, sourceWarehouse]);

  const handleClose = () => {
    setSelectedItem('');
    setQty('');
    setSelectedBom('');
    setStep(1);
    setSubmitting(false);
    onClose();
  };

  const handleNext = () => {
    if (!selectedItem) { toast.error('Please select a production item'); return; }
    if (!qty || parseFloat(qty) <= 0) { toast.error('Quantity must be greater than 0'); return; }
    if (!selectedBom) { toast.error('No BOM found for this item'); return; }
    setStep(2);
  };

  const handleCreate = async () => {
    if (!wipWarehouse || !fgWarehouse) {
      toast.error('WIP and Finished Goods warehouses are required');
      return;
    }
    if (!call || !db) { toast.error('Frappe not connected'); return; }

    setSubmitting(true);
    try {
      // Step 1: Get the pre-filled WO document from ERPNext
      const woDoc = await call.post(
        'erpnext.manufacturing.doctype.work_order.work_order.make_work_order',
        { bom_no: selectedBom, item: selectedItem, qty: parseFloat(qty) },
      ) as { message?: Record<string, unknown> };

      if (!woDoc?.message) throw new Error('make_work_order returned no document');

      // Step 2: Apply warehouse settings from the form
      const docPayload = {
        ...woDoc.message,
        wip_warehouse: wipWarehouse,
        fg_warehouse: fgWarehouse,
        scrap_warehouse: scrapWarehouse || undefined,
        source_warehouse: sourceWarehouse || undefined,
      };

      // Step 3: Create (save as draft)
      const saved = await db.createDoc('Work Order', docPayload);

      // Step 4: Submit
      await db.submit({ doctype: 'Work Order', name: saved.name });

      toast.success(`Work Order ${saved.name} created and submitted`);
      onCreated();
      handleClose();
    } catch (err) {
      showFrappeError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    return (bomItems ?? []).filter((b) => {
      if (seen.has(b.item)) return false;
      seen.add(b.item);
      return true;
    });
  }, [bomItems]);

  const footer = step === 1 ? (
    <>
      <button onClick={handleClose} className="btn-ghost">{LABELS.cancel}</button>
      <button onClick={handleNext} className="btn-primary">Next →</button>
    </>
  ) : (
    <>
      <button onClick={() => setStep(1)} className="btn-ghost">← Back</button>
      <button onClick={handleClose} className="btn-ghost">{LABELS.cancel}</button>
      <button onClick={handleCreate} disabled={submitting} className="btn-primary">
        {submitting ? LABELS.modal.creating : LABELS.submit}
      </button>
    </>
  );

  return (
    <Modal open={open} onClose={handleClose} title={LABELS.modal.newWorkOrder} footer={footer} size="md">
      {step === 1 ? (
        <div className="space-y-5">
          <p className="text-xs text-slate-500">{LABELS.modal.step1}</p>

          <div>
            <label className="label-text" htmlFor="wo-item">{LABELS.modal.selectItem}</label>
            <select
              id="wo-item"
              className="select-field"
              value={selectedItem}
              onChange={(e) => handleItemChange(e.target.value)}
            >
              <option value="">— Select Item —</option>
              {uniqueItems.map((b) => (
                <option key={b.item} value={b.item}>{b.item_name || b.item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-text" htmlFor="wo-qty">{LABELS.modal.qty}</label>
            <input
              id="wo-qty"
              type="number"
              min="0.001"
              step="any"
              className="input-field"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="e.g. 20"
            />
          </div>

          <div>
            <label className="label-text" htmlFor="wo-bom">{LABELS.modal.bom}</label>
            {selectedItem ? (
              <select
                id="wo-bom"
                className="select-field"
                value={selectedBom}
                onChange={(e) => setSelectedBom(e.target.value)}
              >
                {boms.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}{b.is_default ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-slate-500 italic">Select an item first</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-xs text-slate-500">{LABELS.modal.step2}</p>

          {[
            { id: 'wo-wip', label: LABELS.modal.wipWarehouse, val: wipWarehouse, set: setWipWarehouse },
            { id: 'wo-fg', label: LABELS.modal.fgWarehouse, val: fgWarehouse, set: setFgWarehouse },
            { id: 'wo-scrap', label: LABELS.modal.scrapWarehouse, val: scrapWarehouse, set: setScrapWarehouse },
            { id: 'wo-source', label: LABELS.modal.sourceWarehouse, val: sourceWarehouse, set: setSourceWarehouse },
          ].map(({ id, label, val, set }) => (
            <div key={id}>
              <label className="label-text" htmlFor={id}>{label}</label>
              <select id={id} className="select-field" value={val} onChange={(e) => set(e.target.value)}>
                <option value="">— None —</option>
                {warehouses.map((w) => (
                  <option key={w.name} value={w.name}>{w.name}</option>
                ))}
              </select>
            </div>
          ))}

          <div className="p-3 rounded-lg bg-brand-800/50 text-xs text-slate-400 space-y-1">
            <p><span className="text-slate-300">Item:</span> {selectedItem}</p>
            <p><span className="text-slate-300">BOM:</span> {selectedBom}</p>
            <p><span className="text-slate-300">Qty:</span> {qty}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Work Order Drawer ────────────────────────────────────────────────────────

interface WODrawerProps {
  name: string | null;
  onClose: () => void;
  onAction: () => void;
}

function WorkOrderDrawer({ name, onClose, onAction }: WODrawerProps) {
  const frappe = useContext(FrappeContext);
  const { db, call } = frappe ?? {};
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: wo, isLoading: woLoading } = useFrappeGetDoc<Record<string, unknown>>(
    'Work Order',
    name ?? undefined,
  );

  const { data: jobCards } = useFrappeGetDocList<{ name: string; status: string; operation: string; workstation: string }>(
    'Job Card',
    {
      fields: ['name', 'status', 'operation', 'workstation'],
      filters: [['work_order', '=', name ?? '']],
      limit: 50,
    },
  );

  const { data: stockEntries } = useFrappeGetDocList<{ name: string; stock_entry_type: string; posting_date: string; docstatus: number }>(
    'Stock Entry',
    {
      fields: ['name', 'stock_entry_type', 'posting_date', 'docstatus'],
      filters: [['work_order', '=', name ?? '']],
      limit: 50,
    },
  );

  const woStatus = wo?.status as string | undefined;

  const doAction = async (actionKey: string, fn: () => Promise<unknown>) => {
    setActionLoading(actionKey);
    try {
      await fn();
      toast.success('Action completed successfully');
      onAction();
    } catch (err) {
      showFrappeError(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMaterialTransfer = () =>
    doAction('transfer', async () => {
      if (!call || !db) throw new Error('Frappe not connected');
      const se = await call.post(
        'erpnext.manufacturing.doctype.work_order.work_order.make_stock_entry',
        { work_order_id: name!, purpose: 'Material Transfer for Manufacture' },
      ) as { message?: Record<string, unknown> };
      if (!se?.message) throw new Error('No Stock Entry returned');
      const saved = await db.createDoc('Stock Entry', se.message);
      await db.submit({ doctype: 'Stock Entry', name: saved.name });
      toast.success(`Stock Entry ${saved.name} submitted`);
    });

  const handleManufacture = () =>
    doAction('manufacture', async () => {
      if (!call || !db) throw new Error('Frappe not connected');
      const se = await call.post(
        'erpnext.manufacturing.doctype.work_order.work_order.make_stock_entry',
        { work_order_id: name!, purpose: 'Manufacture' },
      ) as { message?: Record<string, unknown> };
      if (!se?.message) throw new Error('No Stock Entry returned');
      const saved = await db.createDoc('Stock Entry', se.message);
      await db.submit({ doctype: 'Stock Entry', name: saved.name });
      toast.success(`Stock Entry ${saved.name} submitted`);
    });

  const handleStopResume = () => {
    const targetStatus = woStatus === 'Stopped' ? 'Resume' : 'Stop';
    doAction('stop', async () => {
      if (!call) throw new Error('Frappe not connected');
      await call.post(
        'erpnext.manufacturing.doctype.work_order.work_order.stop_unstop',
        { work_order: name!, status: targetStatus },
      );
    });
  };

  const docstatus = Number(wo?.docstatus ?? 0);
  const canTransfer = docstatus === 1 && woStatus === 'Not Started';
  const canManufacture = docstatus === 1 && (woStatus === 'In Process' || woStatus === 'Not Started');
  const canStopResume = docstatus === 1 && (woStatus === 'In Process' || woStatus === 'Not Started' || woStatus === 'Stopped');

  return (
    <Drawer open={!!name} onClose={onClose} title={LABELS.drawer.workOrderDetails}>
      {!name ? null : woLoading ? (
        <LoadingState />
      ) : !wo ? (
        <ErrorState message="Work Order not found" />
      ) : (
        <>
          {/* Header info */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-bold text-slate-100">{wo.name as string}</p>
              <p className="text-sm text-slate-400">{(wo.item_name as string) || (wo.production_item as string)}</p>
            </div>
            <StatusPill status={woStatus ?? 'Draft'} />
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Planned Qty', value: `${formatQty(wo.qty as number)} ${wo.stock_uom ?? ''}` },
              { label: 'Produced Qty', value: formatQty(wo.produced_qty as number) },
              { label: 'BOM', value: wo.bom_no as string },
              { label: 'WIP Warehouse', value: wo.wip_warehouse as string },
              { label: 'FG Warehouse', value: wo.fg_warehouse as string },
              { label: 'Created', value: formatDate(wo.creation as string) },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-lg bg-brand-800/50">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-sm text-slate-200 break-all">{value || '—'}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Actions</p>

            {canTransfer && (
              <button
                onClick={handleMaterialTransfer}
                disabled={actionLoading === 'transfer'}
                className="btn-primary w-full justify-center"
                id="wo-action-transfer"
              >
                {actionLoading === 'transfer' ? <RefreshCw size={14} className="animate-spin" /> : null}
                {LABELS.actions.startTransfer}
              </button>
            )}

            {canManufacture && (
              <button
                onClick={handleManufacture}
                disabled={actionLoading === 'manufacture'}
                className="btn-primary w-full justify-center bg-emerald-700 hover:bg-emerald-600"
                id="wo-action-manufacture"
              >
                {actionLoading === 'manufacture' ? <RefreshCw size={14} className="animate-spin" /> : null}
                {LABELS.actions.finishManufacture}
              </button>
            )}

            {canStopResume && (
              <button
                onClick={handleStopResume}
                disabled={actionLoading === 'stop'}
                className={woStatus === 'Stopped' ? 'btn-ghost w-full justify-center' : 'btn-danger w-full justify-center'}
                id="wo-action-stop"
              >
                {woStatus === 'Stopped' ? LABELS.actions.resumeWorkOrder : LABELS.actions.stopWorkOrder}
              </button>
            )}

            <Link
              to={`/work-orders/${encodeURIComponent(name)}`}
              className="btn-ghost w-full justify-center text-xs"
            >
              <ExternalLink size={12} />
              {LABELS.viewInPortal}
            </Link>
          </div>

          {/* Linked Job Cards */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">
              {LABELS.drawer.linkedJobCards}
            </p>
            {!jobCards?.length ? (
              <p className="text-xs text-slate-500 italic">{LABELS.empty.linkedJobCards}</p>
            ) : (
              <div className="space-y-1.5">
                {jobCards.map((jc) => (
                  <Link
                    key={jc.name}
                    to={`/job-cards/${encodeURIComponent(jc.name)}`}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-brand-800/50 hover:bg-brand-700/50 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-medium text-slate-200">{jc.name}</p>
                      <p className="text-[10px] text-slate-500">{jc.operation}</p>
                    </div>
                    <StatusPill status={jc.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Linked Stock Entries */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">
              {LABELS.drawer.linkedStockEntries}
            </p>
            {!stockEntries?.length ? (
              <p className="text-xs text-slate-500 italic">{LABELS.empty.linkedStockEntries}</p>
            ) : (
              <div className="space-y-1.5">
                {stockEntries.map((se) => (
                  <Link
                    key={se.name}
                    to={`/stock-entries/${encodeURIComponent(se.name)}`}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-brand-800/50 hover:bg-brand-700/50 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-medium text-slate-200">{se.name}</p>
                      <p className="text-[10px] text-slate-500">{se.stock_entry_type} · {formatDate(se.posting_date)}</p>
                    </div>
                    <StatusPill status={se.docstatus === 1 ? 'Submitted' : se.docstatus === 2 ? 'Cancelled' : 'Draft'} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Drawer>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['', 'Not Started', 'In Process', 'Completed', 'Stopped', 'Closed'];
const PAGE_SIZE = 50;

export function WorkOrderView() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerName, setDrawerName] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const swrKey = `wo-list-${refreshKey}-${statusFilter}-${page}`;

  // filters type as const workaround to satisfy frappe-react-sdk
  const baseFilters = statusFilter
    ? [['status', '=', statusFilter] as [string, string, string]]
    : undefined;

  const { data: workOrders, isLoading, error } = useFrappeGetDocList<WorkOrderRow>('Work Order', {
    fields: ['name', 'production_item', 'item_name', 'qty', 'produced_qty', 'wip_warehouse', 'status', 'creation'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filters: baseFilters as any,
    limit: PAGE_SIZE,
    limit_start: page * PAGE_SIZE,
    orderBy: { field: 'creation', order: 'desc' },
  }, swrKey);

  return (
    <AppShell title={LABELS.nav.workOrders}>
      {(search) => {
        const filtered = (workOrders ?? []).filter((wo) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return (
            wo.name.toLowerCase().includes(q) ||
            wo.item_name?.toLowerCase().includes(q) ||
            wo.production_item?.toLowerCase().includes(q)
          );
        });

        return (
          <>
            <MetricStrip refreshKey={refreshKey} />

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <select
                id="wo-status-filter"
                className="select-field w-48"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.filter(Boolean).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <div className="flex-1" />

              <button
                id="wo-refresh"
                onClick={refresh}
                className="btn-ghost"
                aria-label="Refresh"
              >
                <RefreshCw size={14} />
              </button>

              <button
                id="wo-new"
                onClick={() => setModalOpen(true)}
                className="btn-new"
              >
                <Plus size={14} />
                {LABELS.actions.newWorkOrder}
              </button>
            </div>

            {/* Table */}
            <div className="card overflow-x-auto">
              {isLoading ? (
                <LoadingState />
              ) : error ? (
                <ErrorState message={String(error)} onRetry={refresh} />
              ) : !filtered.length ? (
                <EmptyState message={LABELS.empty.workOrders} />
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                      {[
                        LABELS.columns.workOrder.id,
                        LABELS.columns.workOrder.item,
                        LABELS.columns.workOrder.plannedQty,
                        LABELS.columns.workOrder.producedQty,
                        LABELS.columns.workOrder.wipWarehouse,
                        LABELS.columns.workOrder.status,
                        LABELS.columns.workOrder.created,
                      ].map((h) => (
                        <th key={h} className="table-header text-left px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((wo) => {
                      const pct = wo.qty > 0 ? (wo.produced_qty / wo.qty) * 100 : 0;
                      return (
                        <tr
                          key={wo.name}
                          className="border-b table-row-hover transition-colors cursor-pointer"
                          style={{ borderColor: 'var(--divider)' }}
                          onClick={() => setDrawerName(wo.name)}
                        >
                          <td className="table-cell">
                            <span
                              className="font-mono text-xs font-semibold hover:underline"
                              style={{ color: 'var(--table-link)' }}
                            >
                              {wo.name}
                            </span>
                          </td>
                          <td className="table-cell">
                            <p className="text-sm font-semibold text-fg">{wo.item_name || wo.production_item}</p>
                            <p className="text-[10px] text-muted">{wo.production_item}</p>
                          </td>
                          <td className="table-cell text-sm font-medium">{formatQty(wo.qty)}</td>
                          <td className="table-cell">
                            <div className="min-w-[100px]">
                              <p className="text-xs text-muted mb-1">{formatQty(wo.produced_qty)} / {formatQty(wo.qty)}</p>
                              <ProgressBar value={pct} color="brand" />
                            </div>
                          </td>
                          <td className="table-cell">
                            <span className="text-xs text-muted">{wo.wip_warehouse || '—'}</span>
                          </td>
                          <td className="table-cell">
                            <StatusPill status={wo.status} />
                          </td>
                          <td className="table-cell">
                            <span className="text-xs" style={{ color: 'var(--table-date)' }}>{formatDate(wo.creation)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Pagination */}
              {(workOrders?.length ?? 0) >= PAGE_SIZE && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-brand-700/30">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="btn-ghost text-xs"
                  >
                    <ChevronUp size={12} className="-rotate-90" /> Prev
                  </button>
                  <span className="text-xs text-slate-500">Page {page + 1}</span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    className="btn-ghost text-xs"
                  >
                    Next <ChevronDown size={12} className="-rotate-90" />
                  </button>
                </div>
              )}
            </div>

            {/* Modal */}
            <NewWorkOrderModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              onCreated={refresh}
            />

            {/* Drawer */}
            <WorkOrderDrawer
              name={drawerName}
              onClose={() => setDrawerName(null)}
              onAction={refresh}
            />
          </>
        );
      }}
    </AppShell>
  );
}
