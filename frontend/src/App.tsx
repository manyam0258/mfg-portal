import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { FrappeProvider, useFrappeAuth } from 'frappe-react-sdk';

import { ThemeProvider } from '@/contexts/ThemeContext';
import { DocumentPage } from '@/components/documents/DocumentPage';
import { LABELS } from '@/constants/labels';

// Home / Dashboard
import { HomeView } from '@/views/HomeView';
import { ProfileView } from '@/views/ProfileView';

// Manufacturing Views
import { WorkOrderView } from '@/views/WorkOrderView';
import { BOMView } from '@/views/BOMView';
import { JobCardView } from '@/views/JobCardView';
import { StockView } from '@/views/StockView';
import { StockEntryView } from '@/views/StockEntryView';
import { ProductionPlanView } from '@/views/ProductionPlanView';

// Sales & Accounts Views
import { SalesOrdersView } from '@/views/SalesOrdersView';
import { DeliveryNotesView } from '@/views/DeliveryNotesView';
import { SalesInvoicesView } from '@/views/SalesInvoicesView';
import { PaymentEntriesView } from '@/views/PaymentEntriesView';

// Reports Views
import { ReportsHubView } from '@/views/reports/ReportsHubView';
import { ProfitAndLossView } from '@/views/reports/ProfitAndLossView';
import { GrossProfitView } from '@/views/reports/GrossProfitView';
import { BalanceSheetView } from '@/views/reports/BalanceSheetView';
import { TrialBalanceView } from '@/views/reports/TrialBalanceView';
import { GeneralLedgerView } from '@/views/reports/GeneralLedgerView';
import { StockLedgerView } from '@/views/reports/StockLedgerView';
import { StockBalanceView } from '@/views/reports/StockBalanceView';
import { StockProjectedQtyView } from '@/views/reports/StockProjectedQtyView';

// ─── Auth Guard ───────────────────────────────────────────────────────────────

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useFrappeAuth();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (window.location.pathname.startsWith('/login')) return;
    if (!currentUser && !redirectedRef.current) {
      redirectedRef.current = true;
      window.location.replace('/login?redirect-to=/mfg_portal');
    }
  }, [currentUser, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-app">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted">Loading portal…</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  return <>{children}</>;
}

// ─── App Routes ───────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <AuthGuard>
      <Routes>
        {/* Home Dashboard */}
        <Route path="/" element={<HomeView />} />
        <Route path="/profile" element={<ProfileView />} />

        {/* Manufacturing Lists */}
        <Route path="/work-orders" element={<WorkOrderView />} />
        <Route path="/bom" element={<BOMView />} />
        <Route path="/job-cards" element={<JobCardView />} />
        <Route path="/stock-entries" element={<StockEntryView />} />
        <Route path="/production-plans" element={<ProductionPlanView />} />
        <Route path="/stock" element={<StockView />} />

        {/* Sales & Accounts Lists */}
        <Route path="/sales-orders" element={<SalesOrdersView />} />
        <Route path="/delivery-notes" element={<DeliveryNotesView />} />
        <Route path="/sales-invoices" element={<SalesInvoicesView />} />
        <Route path="/payments" element={<PaymentEntriesView />} />

        {/* In-Portal Document Pages */}
        <Route
          path="/work-orders/:name"
          element={
            <DocumentPage
              doctype="Work Order"
              routePrefix="work-orders"
              hasStockLedger={true}
              hasAccountingLedger={true}
              label={LABELS.workOrder}
            />
          }
        />
        <Route
          path="/bom/:name"
          element={
            <DocumentPage
              doctype="BOM"
              routePrefix="bom"
              label={LABELS.bom}
            />
          }
        />
        <Route
          path="/job-cards/:name"
          element={
            <DocumentPage
              doctype="Job Card"
              routePrefix="job-cards"
              label={LABELS.jobCard}
            />
          }
        />
        <Route
          path="/stock-entries/:name"
          element={
            <DocumentPage
              doctype="Stock Entry"
              routePrefix="stock-entries"
              hasStockLedger={true}
              hasAccountingLedger={true}
              label={LABELS.stockEntry}
            />
          }
        />
        <Route
          path="/production-plans/:name"
          element={
            <DocumentPage
              doctype="Production Plan"
              routePrefix="production-plans"
              label={LABELS.productionPlan}
            />
          }
        />
        <Route
          path="/sales-orders/:name"
          element={
            <DocumentPage
              doctype="Sales Order"
              routePrefix="sales-orders"
              label="Sales Order"
            />
          }
        />
        <Route
          path="/delivery-notes/:name"
          element={
            <DocumentPage
              doctype="Delivery Note"
              routePrefix="delivery-notes"
              hasStockLedger={true}
              hasAccountingLedger={true}
              label="Delivery Note"
            />
          }
        />
        <Route
          path="/sales-invoices/:name"
          element={
            <DocumentPage
              doctype="Sales Invoice"
              routePrefix="sales-invoices"
              hasStockLedger={true}
              hasAccountingLedger={true}
              label="Sales Invoice"
            />
          }
        />
        <Route
          path="/payments/:name"
          element={
            <DocumentPage
              doctype="Payment Entry"
              routePrefix="payments"
              hasAccountingLedger={true}
              label="Payment Entry"
            />
          }
        />
        <Route
          path="/purchase-receipts/:name"
          element={
            <DocumentPage
              doctype="Purchase Receipt"
              routePrefix="purchase-receipts"
              hasStockLedger={true}
              hasAccountingLedger={true}
              label="Purchase Receipt"
            />
          }
        />
        <Route
          path="/purchase-invoices/:name"
          element={
            <DocumentPage
              doctype="Purchase Invoice"
              routePrefix="purchase-invoices"
              hasStockLedger={true}
              hasAccountingLedger={true}
              label="Purchase Invoice"
            />
          }
        />
        <Route
          path="/material-requests/:name"
          element={
            <DocumentPage
              doctype="Material Request"
              routePrefix="material-requests"
              label="Material Request"
            />
          }
        />

        {/* Reports */}
        <Route path="/reports" element={<ReportsHubView />} />
        <Route path="/reports/profit-and-loss" element={<ProfitAndLossView />} />
        <Route path="/reports/gross-profit" element={<GrossProfitView />} />
        <Route path="/reports/balance-sheet" element={<BalanceSheetView />} />
        <Route path="/reports/trial-balance" element={<TrialBalanceView />} />
        <Route path="/reports/general-ledger" element={<GeneralLedgerView />} />
        <Route path="/reports/stock-ledger" element={<StockLedgerView />} />
        <Route path="/reports/stock-balance" element={<StockBalanceView />} />
        <Route path="/reports/stock-projected-qty" element={<StockProjectedQtyView />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthGuard>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider>
      <FrappeProvider>
        <BrowserRouter basename={import.meta.env.DEV ? "" : "/mfg_portal"}>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                fontSize: '13px',
              },
              success: {
                iconTheme: { primary: '#34d399', secondary: 'var(--bg-card)' },
              },
              error: {
                iconTheme: { primary: '#E04843', secondary: 'var(--bg-card)' },
              },
            }}
          />
        </BrowserRouter>
      </FrappeProvider>
    </ThemeProvider>
  );
}
