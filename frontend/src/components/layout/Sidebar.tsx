import { NavLink } from 'react-router-dom';
import { useFrappeGetCall } from 'frappe-react-sdk';
import {
  ClipboardList, BookOpen, Briefcase, ArrowLeftRight,
  BarChart3, Package, Home, ShoppingCart,
  FileText, TrendingUp, DollarSign,
} from 'lucide-react';
import { LABELS } from '@/constants/labels';

const MFG_NAV = [
  { to: '/work-orders',      icon: ClipboardList,  label: LABELS.nav.workOrders },
  { to: '/bom',              icon: BookOpen,        label: LABELS.nav.bom },
  { to: '/job-cards',        icon: Briefcase,       label: LABELS.nav.jobCards },
  { to: '/stock-entries',    icon: ArrowLeftRight,  label: LABELS.nav.stockEntries },
  { to: '/production-plans', icon: BarChart3,       label: LABELS.nav.productionPlans },
  { to: '/stock',            icon: Package,         label: LABELS.nav.stock },
];

const SALES_NAV = [
  { to: '/sales-orders',     icon: ShoppingCart,    label: LABELS.nav.salesOrders },
  { to: '/delivery-notes',   icon: FileText,        label: LABELS.nav.deliveryNotes },
  { to: '/sales-invoices',   icon: DollarSign,      label: LABELS.nav.salesInvoices },
  { to: '/payments',         icon: TrendingUp,      label: LABELS.nav.payments },
];

const REPORTS_NAV = [
  { to: '/reports/profit-and-loss', icon: TrendingUp,  label: LABELS.nav.profitLoss },
  { to: '/reports/gross-profit',    icon: BarChart3,   label: LABELS.nav.grossProfit },
  { to: '/reports/balance-sheet',   icon: FileText,    label: LABELS.nav.balanceSheet },
  { to: '/reports/trial-balance',   icon: FileText,    label: LABELS.nav.trialBalance },
  { to: '/reports/general-ledger',  icon: BookOpen,    label: LABELS.nav.generalLedger },
  { to: '/reports/stock-ledger',    icon: Package,     label: LABELS.nav.stockLedgerReport },
  { to: '/reports/stock-balance',   icon: Package,     label: LABELS.nav.stockBalance },
  { to: '/reports/stock-projected', icon: BarChart3,   label: LABELS.nav.stockProjected },
];

interface NavItem { to: string; icon: React.ComponentType<{ size?: number; className?: string }>; label: string; }

function NavSection({ caption, items }: { caption: string; items: NavItem[] }) {
  return (
    <div className="mb-4">
      <p className="sidebar-caption">
        {caption}
      </p>
      <ul className="space-y-0.5">
        {items.map(({ to, icon: Icon, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) => isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item'}
            >
              <Icon size={15} className="flex-shrink-0 text-white/80" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sidebar() {
  const { data: pingData, error: pingError } = useFrappeGetCall<{ message: string }>(
    'frappe.ping', {}, 'frappe.ping', { refreshInterval: 30000 },
  );
  const isConnected = !pingError && pingData?.message === 'pong';

  return (
    <aside
      className="sidebar-container fixed top-0 left-0 h-full w-60 flex flex-col z-30 select-none"
    >
      {/* Logo Header */}
      <div
        className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid var(--navy-700)' }}
      >
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="Company Logo"
          className="w-8 h-8 rounded-lg object-contain flex-shrink-0 bg-white/10 p-0.5"
          onError={(e) => {
            // Fallback if image path differs
            (e.target as HTMLImageElement).src = '/logo.png';
          }}
        />
        <div>
          <div className="text-sm font-bold text-white tracking-wide">{LABELS.appName}</div>
          <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--navy-300)' }}>
            Manufacturing
          </div>
        </div>
      </div>

      {/* Dashboard link */}
      <div className="px-3 pt-3">
        <NavLink
          to="/"
          end
          className={({ isActive }) => isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item'}
        >
          <Home size={15} className="flex-shrink-0 text-white/80" />
          <span>Dashboard</span>
        </NavLink>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-1">
        <NavSection caption={LABELS.nav.mainMenu} items={MFG_NAV} />
        <div className="my-2 border-t" style={{ borderColor: 'var(--navy-700)' }} />
        <NavSection caption="Sales & Accounts" items={SALES_NAV} />
        <div className="my-2 border-t" style={{ borderColor: 'var(--navy-700)' }} />
        <NavSection caption="Reports" items={REPORTS_NAV} />
      </nav>

      {/* Connection status footer */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--navy-700)' }}>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'var(--navy-800)' }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              backgroundColor: isConnected ? 'var(--badge-success-text)' : 'var(--badge-danger-text)',
              boxShadow: isConnected ? '0 0 6px var(--badge-success-text)' : 'none',
            }}
          />
          <span
            className="text-[11px] font-medium leading-tight truncate"
            style={{ color: 'var(--navy-300)' }}
          >
            {isConnected ? LABELS.connected : LABELS.disconnected}
          </span>
        </div>
      </div>
    </aside>
  );
}
