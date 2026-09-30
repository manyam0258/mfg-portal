import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, DollarSign, Scale, BookOpen, Layers,
  Package, Box, AlertTriangle, ArrowRight,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { LABELS } from '@/constants/labels';

interface ReportCardItem {
  id: string;
  title: string;
  description: string;
  route: string;
  category: 'Financial' | 'Stock & Inventory';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accentColor: string;
}

const REPORTS: ReportCardItem[] = [
  {
    id: 'profit-and-loss',
    title: 'Profit and Loss Statement',
    description: 'Income, expense, provisional gross profit, and net profit statement with period comparison, charts, and ledger drill-down.',
    route: '/reports/profit-and-loss',
    category: 'Financial',
    icon: TrendingUp,
    accentColor: 'var(--success-text)',
  },
  {
    id: 'gross-profit',
    title: 'Gross Profit',
    description: 'Selling vs buying amounts, gross profit, and gross profit percentage broken down by Invoice, Item, Customer or Sales Person.',
    route: '/reports/gross-profit',
    category: 'Financial',
    icon: DollarSign,
    accentColor: 'var(--navy-600)',
  },
  {
    id: 'balance-sheet',
    title: 'Balance Sheet',
    description: 'Statement of assets, liabilities, and equity with hierarchical tree structure, collapsible accounts, and period comparison.',
    route: '/reports/balance-sheet',
    category: 'Financial',
    icon: Scale,
    accentColor: 'var(--navy-500)',
  },
  {
    id: 'trial-balance',
    title: 'Trial Balance',
    description: 'Debit and credit balances for all general ledger accounts verifying accounting equilibrium for the financial period.',
    route: '/reports/trial-balance',
    category: 'Financial',
    icon: BookOpen,
    accentColor: 'var(--navy-400)',
  },
  {
    id: 'general-ledger',
    title: 'General Ledger',
    description: 'Complete transaction-level accounting ledger filtered by account, voucher, date range, party, and cost center with in-portal links.',
    route: '/reports/general-ledger',
    category: 'Financial',
    icon: Layers,
    accentColor: 'var(--warning-text)',
  },
  {
    id: 'stock-ledger',
    title: 'Stock Ledger',
    description: 'Chronological record of all inventory transactions, batch movements, valuation changes, and stock balances by item and warehouse.',
    route: '/reports/stock-ledger',
    category: 'Stock & Inventory',
    icon: Package,
    accentColor: 'var(--navy-600)',
  },
  {
    id: 'stock-balance',
    title: 'Stock Balance',
    description: 'Current closing quantity, valuation rate, and total inventory value across all warehouses and item groups.',
    route: '/reports/stock-balance',
    category: 'Stock & Inventory',
    icon: Box,
    accentColor: 'var(--navy-700)',
  },
  {
    id: 'stock-projected-qty',
    title: 'Stock Projected Qty',
    description: 'Available inventory versus reorder levels, projected shortages, lead times, and quick material request generation.',
    route: '/reports/stock-projected-qty',
    category: 'Stock & Inventory',
    icon: AlertTriangle,
    accentColor: 'var(--red-600)',
  },
];

export function ReportsHubView() {
  const navigate = useNavigate();

  const financialReports = REPORTS.filter((r) => r.category === 'Financial');
  const stockReports = REPORTS.filter((r) => r.category === 'Stock & Inventory');

  return (
    <AppShell title={LABELS.nav.reports}>
      {() => (
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h2 className="text-sm font-semibold text-fg uppercase tracking-wider">Financial & Accounting Reports</h2>
            </div>
            <p className="text-xs text-muted mb-4">Official ERPNext financial statements and ledgers, rendered natively inside the portal.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {financialReports.map((report) => {
                const Icon = report.icon;
                return (
                  <div
                    key={report.id}
                    onClick={() => navigate(report.route)}
                    className="card p-5 cursor-pointer hover:border-primary/50 transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                          style={{ background: 'var(--bg-card2)', color: report.accentColor }}
                        >
                          <Icon size={20} />
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-card2 border border-line text-muted font-medium">
                          {report.category}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-fg group-hover:text-primary transition-colors mb-2">
                        {report.title}
                      </h3>
                      <p className="text-xs text-muted line-clamp-3 leading-relaxed">
                        {report.description}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs text-muted group-hover:text-fg">
                      <span>Open Report</span>
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <h2 className="text-sm font-semibold text-fg uppercase tracking-wider">Stock & Inventory Reports</h2>
            </div>
            <p className="text-xs text-muted mb-4">Real-time valuation, inventory movements, and reorder projections.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stockReports.map((report) => {
                const Icon = report.icon;
                return (
                  <div
                    key={report.id}
                    onClick={() => navigate(report.route)}
                    className="card p-5 cursor-pointer hover:border-primary/50 transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                          style={{ background: 'var(--bg-card2)', color: report.accentColor }}
                        >
                          <Icon size={20} />
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-card2 border border-line text-muted font-medium">
                          {report.category}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-fg group-hover:text-primary transition-colors mb-2">
                        {report.title}
                      </h3>
                      <p className="text-xs text-muted line-clamp-3 leading-relaxed">
                        {report.description}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs text-muted group-hover:text-fg">
                      <span>Open Report</span>
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
