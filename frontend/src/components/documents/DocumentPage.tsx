import { useState, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useFrappeGetDoc, useFrappeGetCall, FrappeContext } from 'frappe-react-sdk';
import toast from 'react-hot-toast';
import { ArrowLeft, RefreshCw, ExternalLink, MessageSquare, ArrowRight } from 'lucide-react';
import { LABELS } from '@/constants/labels';
import { formatDate, formatINR } from '@/lib/format';
import { StatusPill } from '@/components/ui/StatusPill';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { StockLedgerTab, AccountingLedgerTab } from '@/components/documents/LedgerTabs';
import { FlowStepper } from '@/components/documents/FlowStepper';
import { showFrappeError } from '@/lib/frappeError';
import { AppShell } from '@/components/layout/AppShell';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentPageProps {
  doctype: string;
  routePrefix: string;
  /** Whether this DocType generates stock entries */
  hasStockLedger?: boolean;
  /** Whether this DocType generates GL entries */
  hasAccountingLedger?: boolean;
  /** Field name that holds posting date */
  dateField?: string;
  /** Render extra action buttons (receives the doc) */
  actions?: (doc: Record<string, unknown>, refresh: () => void) => React.ReactNode;
  /** Render the details tab body */
  detailsContent?: (doc: Record<string, unknown>) => React.ReactNode;
  /** Label shown in breadcrumb / title */
  label?: string;
}

type Tab = 'details' | 'stock-ledger' | 'accounting-ledger' | 'linked' | 'activity';

// ─── Field renderer (generic from DocType metadata) ───────────────────────────

function FieldValue({ value, fieldtype }: { value: unknown; fieldtype?: string }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted text-sm">—</span>;
  }
  if (fieldtype === 'Date' || fieldtype === 'Datetime') {
    return <span className="text-sm text-fg">{formatDate(String(value))}</span>;
  }
  if (fieldtype === 'Check') {
    return <span className={`text-sm ${value ? 'text-emerald-500' : 'text-muted'}`}>{value ? 'Yes' : 'No'}</span>;
  }
  if (fieldtype === 'Text Editor' || fieldtype === 'Long Text') {
    return <span className="text-sm text-fg whitespace-pre-wrap line-clamp-4">{String(value)}</span>;
  }
  return <span className="text-sm text-fg break-all">{String(value)}</span>;
}

// ─── Auto-rendered details from DocType metadata ──────────────────────────────

interface AutoDetailsProps {
  doc: Record<string, unknown>;
  doctype: string;
}

function AutoDetails({ doc, doctype }: AutoDetailsProps) {
  const { data: metaData } = useFrappeGetCall<{ message?: { docs?: Array<{ fields?: Array<{ fieldname: string; label: string; fieldtype: string; in_list_view?: 0|1; hidden?: 0|1; permlevel?: number }> }> } }>(
    'frappe.desk.form.load.getdoctype',
    { doctype, with_parent: 1, cached_timestamp: null },
    `doctype-meta-${doctype}`,
    { revalidateOnFocus: false },
  );

  const fields = metaData?.message?.docs?.[0]?.fields ?? [];
  const displayFields = fields.filter((f) =>
    !f.hidden &&
    f.permlevel === 0 &&
    !['Table', 'Table MultiSelect', 'Section Break', 'Column Break', 'HTML', 'Button'].includes(f.fieldtype),
  ).slice(0, 40);

  if (!displayFields.length) {
    // Fallback: show all top-level non-null fields from the doc
    const docFields = Object.entries(doc).filter(([k]) => !k.startsWith('_') && !['doctype', 'owner', 'modified_by', 'idx'].includes(k));
    return (
      <div className="grid grid-cols-2 gap-3">
        {docFields.map(([key, val]) => (
          <div key={key} className="card-inner p-3">
            <p className="text-[10px] text-muted uppercase tracking-wide mb-0.5">{key.replace(/_/g, ' ')}</p>
            <FieldValue value={val} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {displayFields.map((f) => (
        <div key={f.fieldname} className="card-inner p-3">
          <p className="text-[10px] text-muted uppercase tracking-wide mb-0.5">{f.label}</p>
          <FieldValue value={doc[f.fieldname]} fieldtype={f.fieldtype} />
        </div>
      ))}
    </div>
  );
}

// ─── Child Tables ─────────────────────────────────────────────────────────────

interface ChildTableProps {
  doc: Record<string, unknown>;
  doctype: string;
}

function ChildTables({ doc, doctype }: ChildTableProps) {
  const { data: metaData } = useFrappeGetCall<{ message?: { docs?: Array<{ fields?: Array<{ fieldname: string; label: string; fieldtype: string; options?: string }> }> } }>(
    'frappe.desk.form.load.getdoctype',
    { doctype, with_parent: 1, cached_timestamp: null },
    `doctype-meta-${doctype}`,
    { revalidateOnFocus: false },
  );

  const tableFields = (metaData?.message?.docs?.[0]?.fields ?? []).filter((f) => f.fieldtype === 'Table');

  if (!tableFields.length) {
    return <EmptyState message="No child tables for this document type." />;
  }

  return (
    <div className="space-y-6">
      {tableFields.map((tf) => {
        const items = (doc[tf.fieldname] as Record<string, unknown>[]) ?? [];
        return (
          <div key={tf.fieldname}>
            <h3 className="text-sm font-semibold text-fg mb-3">{tf.label}</h3>
            {!items.length ? (
              <p className="text-sm text-muted italic">No items</p>
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card2)' }}>
                      {Object.keys(items[0]).filter((k) => !['name', 'parent', 'parenttype', 'parentfield', 'doctype', 'idx', 'docstatus', 'owner', 'modified', 'modified_by', 'creation'].includes(k)).slice(0, 10).map((k) => (
                        <th key={k} className="px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wide text-left whitespace-nowrap">
                          {k.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => {
                      const keys = Object.keys(items[0]).filter((k) => !['name', 'parent', 'parenttype', 'parentfield', 'doctype', 'idx', 'docstatus', 'owner', 'modified', 'modified_by', 'creation'].includes(k)).slice(0, 10);
                      return (
                        <tr key={i} className="table-row-hover border-b" style={{ borderColor: 'var(--divider)' }}>
                          {keys.map((k) => (
                            <td key={k} className="table-cell text-xs">{String(item[k] ?? '—')}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Linked Documents ─────────────────────────────────────────────────────────

interface LinkedDocsProps {
  doctype: string;
  docname: string;
}

const DOCTYPE_ROUTES: Record<string, string> = {
  'Stock Entry': 'stock-entries',
  'Work Order': 'work-orders',
  'Sales Invoice': 'sales-invoices',
  'Delivery Note': 'delivery-notes',
  'Payment Entry': 'payments',
  'Sales Order': 'sales-orders',
  'Job Card': 'job-cards',
  'Production Plan': 'production-plans',
};

function LinkedDocs({ doctype, docname }: LinkedDocsProps) {
  const { data: docinfo } = useFrappeGetCall<{
    message?: {
      links?: Array<{ link_doctype: string; link_name: string; link_title?: string }>;
    };
  }>(
    'frappe.desk.form.load.get_docinfo',
    { doctype, name: docname },
    `docinfo-${doctype}-${docname}`,
    { revalidateOnFocus: false },
  );

  const links = docinfo?.message?.links ?? [];

  if (!links.length) return <EmptyState message="No linked documents." />;

  return (
    <div className="space-y-2">
      {links.map((link, i) => {
        const route = DOCTYPE_ROUTES[link.link_doctype];
        return (
          <div key={i} className="card-inner flex items-center justify-between p-3">
            <div>
              <p className="text-xs text-muted">{link.link_doctype}</p>
              <p className="text-sm font-medium text-fg">{link.link_name}</p>
            </div>
            {route ? (
              <Link
                to={`/${route}/${link.link_name}`}
                className="btn-ghost text-xs px-3 py-1.5"
              >
                View
              </Link>
            ) : (
              <span className="text-xs text-muted">{link.link_title}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Activity Tab ─────────────────────────────────────────────────────────────

interface ActivityTabProps {
  doctype: string;
  docname: string;
}

function ActivityTab({ doctype, docname }: ActivityTabProps) {
  const frappe = useContext(FrappeContext);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: docinfo, mutate } = useFrappeGetCall<{
    message?: {
      comments?: Array<{ name: string; content: string; owner: string; creation: string }>;
      versions?: Array<{ name: string; data: string; owner: string; creation: string }>;
      attachments?: Array<{ name: string; file_name: string; file_url: string }>;
    };
  }>(
    'frappe.desk.form.load.get_docinfo',
    { doctype, name: docname },
    `docinfo-${doctype}-${docname}`,
    { revalidateOnFocus: false },
  );

  const addComment = async () => {
    if (!comment.trim() || !frappe?.call) return;
    setSubmitting(true);
    try {
      await frappe.call.post('frappe.desk.form.utils.add_comment', {
        reference_doctype: doctype,
        reference_name: docname,
        content: comment,
        comment_email: '',
        comment_by: '',
      });
      toast.success('Comment added');
      setComment('');
      mutate();
    } catch (err) {
      showFrappeError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const comments = docinfo?.message?.comments ?? [];
  const versions = docinfo?.message?.versions ?? [];
  const attachments = docinfo?.message?.attachments ?? [];

  return (
    <div className="space-y-6">
      {/* Add comment */}
      <div className="card-inner p-4 space-y-3">
        <p className="text-xs font-semibold text-fg uppercase tracking-wide">Add Comment</p>
        <textarea
          className="input-field resize-none"
          rows={3}
          placeholder="Write a comment…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button onClick={addComment} disabled={submitting || !comment.trim()} className="btn-primary text-xs">
          <MessageSquare size={13} />
          {submitting ? 'Posting…' : 'Post Comment'}
        </button>
      </div>

      {/* Comments */}
      {comments.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Comments</p>
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.name} className="card-inner p-3">
                <div className="flex justify-between mb-1">
                  <p className="text-xs font-medium text-fg">{c.owner}</p>
                  <p className="text-[10px] text-muted">{formatDate(c.creation)}</p>
                </div>
                <p className="text-sm text-fg whitespace-pre-wrap">{c.content.replace(/<[^>]+>/g, '')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Versions */}
      {versions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Version History</p>
          <div className="space-y-1.5">
            {versions.slice(0, 10).map((v) => (
              <div key={v.name} className="card-inner p-2.5 flex justify-between items-center">
                <p className="text-xs text-fg">{v.owner}</p>
                <p className="text-[10px] text-muted">{formatDate(v.creation)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Attachments</p>
          <div className="space-y-1.5">
            {attachments.map((a) => (
              <a
                key={a.name}
                href={a.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="card-inner p-2.5 flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <ExternalLink size={13} className="text-muted flex-shrink-0" />
                <span className="text-sm text-fg truncate">{a.file_name}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {!comments.length && !versions.length && !attachments.length && (
        <EmptyState message="No activity for this document." />
      )}
    </div>
  );
}

// ─── Main DocumentPage ────────────────────────────────────────────────────────

export function DocumentPage({
  doctype,
  routePrefix,
  hasStockLedger = false,
  hasAccountingLedger = false,
  dateField = 'posting_date',
  actions,
  detailsContent,
  label,
}: DocumentPageProps) {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const frappe = useContext(FrappeContext);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [actionLoading, setActionLoading] = useState('');

  const { data: doc, isLoading, error, mutate } = useFrappeGetDoc<Record<string, unknown>>(
    doctype, name ?? undefined,
  );

  const docstatus = Number(doc?.docstatus ?? 0);
  const status = (doc?.status as string) ?? (docstatus === 0 ? 'Draft' : docstatus === 1 ? 'Submitted' : 'Cancelled');
  const postingDate = doc?.[dateField] as string | undefined;
  const company = (doc?.company as string) ?? '';

  const handleSubmit = async () => {
    if (!frappe?.db || !name) return;
    setActionLoading('submit');
    try {
      await frappe.db.submit({ doctype, name });
      toast.success('Document submitted');
      mutate();
    } catch (err) { showFrappeError(err); }
    finally { setActionLoading(''); }
  };

  const handleCancel = async () => {
    if (!frappe?.call || !name) return;
    setActionLoading('cancel');
    try {
      await frappe.call.post('frappe.client.cancel', { doctype, name });
      toast.success('Document cancelled');
      mutate();
    } catch (err) { showFrappeError(err); }
    finally { setActionLoading(''); }
  };

  const tabs: Array<{ id: Tab; label: string; show: boolean }> = [
    { id: 'details' as Tab,           label: LABELS.docTabs.details,           show: true },
    { id: 'stock-ledger' as Tab,      label: LABELS.docTabs.stockLedger,       show: hasStockLedger && docstatus === 1 },
    { id: 'accounting-ledger' as Tab, label: LABELS.docTabs.accountingLedger,  show: hasAccountingLedger && docstatus === 1 },
    { id: 'linked' as Tab,            label: LABELS.docTabs.linkedDocs,        show: true },
    { id: 'activity' as Tab,          label: LABELS.docTabs.activity,          show: true },
  ].filter((t) => t.show);

  const pageTitle = `${label ?? doctype}: ${name ?? '…'}`;

  return (
    <AppShell title={pageTitle}>
      {() => (
        <>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => navigate(`/${routePrefix}`)} className="flex items-center gap-1.5 text-xs text-muted hover:text-fg transition-colors">
              <ArrowLeft size={13} />
              {label ?? doctype}
            </button>
            <span className="text-muted text-xs">/</span>
            <span className="text-xs text-fg font-mono">{name}</span>
          </div>

          {isLoading ? <LoadingState /> : error ? <ErrorState message={String(error)} onRetry={() => mutate()} /> : !doc ? null : (
            <>
              {/* Header */}
              <div className="card p-5 mb-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-xl font-bold text-fg font-mono">{name}</h1>
                      <StatusPill status={status} />
                      <span className="text-xs text-muted card-inner px-2 py-0.5">
                        {docstatus === 0 ? 'Draft' : docstatus === 1 ? 'Submitted' : 'Cancelled'}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      Created by {String(doc.owner ?? '')} on {formatDate(String(doc.creation ?? ''))}
                      {doc.modified && ` · Modified ${formatDate(String(doc.modified))}`}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {docstatus === 0 && (
                      <button onClick={handleSubmit} disabled={actionLoading === 'submit'} className="btn-primary">
                        {actionLoading === 'submit' ? <RefreshCw size={13} className="animate-spin" /> : null}
                        Submit
                      </button>
                    )}
                    {docstatus === 1 && (
                      <button onClick={handleCancel} disabled={actionLoading === 'cancel'} className="btn-danger">
                        Cancel
                      </button>
                    )}
                    {actions && actions(doc, mutate)}
                    <button onClick={() => mutate()} className="btn-ghost">
                      <RefreshCw size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Production-to-P&L Flow Stepper */}
              {(doctype === 'Work Order' || doctype === 'Delivery Note' || doctype === 'Sales Invoice') && (
                <FlowStepper
                  currentDocType={doctype as 'Work Order' | 'Delivery Note' | 'Sales Invoice'}
                  currentDocName={name!}
                  postingDate={postingDate}
                  workOrderName={doctype === 'Work Order' ? name! : (doc.work_order as string)}
                  deliveryNoteName={doctype === 'Delivery Note' ? name! : undefined}
                  salesInvoiceName={doctype === 'Sales Invoice' ? name! : undefined}
                />
              )}

              {/* Impact on P&L strip (Section E5) */}
              {(doctype === 'Sales Invoice' || doctype === 'Delivery Note') && (
                <div className="card p-3 mb-4 flex items-center justify-between gap-4 flex-wrap bg-card border border-line">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-fg uppercase tracking-wide">Impact on P&L:</span>
                    {doctype === 'Sales Invoice' && (
                      <span className="text-xs font-mono font-bold" style={{ color: 'var(--success)' }}>
                        Sales Revenue: {formatINR(Number(doc.grand_total || doc.net_total || 0))}
                      </span>
                    )}
                    {doctype === 'Delivery Note' && (
                      <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent)' }}>
                        COGS & Stock Dispatched: {formatINR(Number(doc.total_incoming_value || doc.grand_total || 0))}
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/reports/profit-and-loss?from_date=${postingDate || ''}&to_date=${postingDate || ''}&filter_based_on=Date+Range`}
                    className="btn-ghost text-xs py-1 px-3 flex items-center gap-1.5"
                    style={{ color: 'var(--primary)' }}
                  >
                    Open P&L for {postingDate ? formatDate(postingDate) : 'this period'}
                    <ArrowRight size={12} />
                  </Link>
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-1 mb-4 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    id={`doctab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'text-fg'
                        : 'text-muted hover:text-fg'
                    }`}
                    style={{
                      background: activeTab === tab.id ? 'var(--bg-hover)' : undefined,
                      borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="animate-fade-in">
                {activeTab === 'details' && (
                  detailsContent ? detailsContent(doc) : <AutoDetails doc={doc} doctype={doctype} />
                )}
                {activeTab === 'stock-ledger' && hasStockLedger && (
                  <StockLedgerTab
                    voucherNo={name!}
                    voucherType={doctype}
                    company={company}
                    postingDate={postingDate}
                    workOrder={doctype === 'Work Order' ? name! : undefined}
                  />
                )}
                {activeTab === 'accounting-ledger' && hasAccountingLedger && (
                  <AccountingLedgerTab
                    voucherNo={name!}
                    voucherType={doctype}
                    company={company}
                    postingDate={postingDate}
                    workOrder={doctype === 'Work Order' ? name! : undefined}
                  />
                )}
                {activeTab === 'linked' && <LinkedDocs doctype={doctype} docname={name!} />}
                {activeTab === 'activity' && <ActivityTab doctype={doctype} docname={name!} />}

                {/* Items / Child Tables - shown in details tab area as second section */}
                {activeTab === 'details' && (
                  <div className="mt-6">
                    <h2 className="text-sm font-semibold text-fg mb-3">{LABELS.docTabs.items}</h2>
                    <ChildTables doc={doc} doctype={doctype} />
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
