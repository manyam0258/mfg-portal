import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, FileText, TrendingUp, DollarSign,
  Package, Layers, Plus, Factory, Briefcase, ShoppingCart,
} from 'lucide-react';

interface PaletteItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Reports' | 'Actions';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  action: () => void;
  shortcut?: string;
}

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const items: PaletteItem[] = [
    // Navigation
    { id: 'nav-home', title: 'Dashboard / Home', category: 'Navigation', icon: Factory, action: () => navigate('/') },
    { id: 'nav-wo', title: 'Work Orders', category: 'Navigation', icon: Factory, action: () => navigate('/work-orders') },
    { id: 'nav-bom', title: 'Bill of Materials (BOM)', category: 'Navigation', icon: FileText, action: () => navigate('/bom') },
    { id: 'nav-jc', title: 'Job Cards', category: 'Navigation', icon: Briefcase, action: () => navigate('/job-cards') },
    { id: 'nav-se', title: 'Stock Entries', category: 'Navigation', icon: Layers, action: () => navigate('/stock-entries') },
    { id: 'nav-pp', title: 'Production Plans', category: 'Navigation', icon: Layers, action: () => navigate('/production-plans') },
    { id: 'nav-stock', title: 'Stock / Items', category: 'Navigation', icon: Package, action: () => navigate('/stock') },
    { id: 'nav-so', title: 'Sales Orders', category: 'Navigation', icon: ShoppingCart, action: () => navigate('/sales-orders') },
    { id: 'nav-dn', title: 'Delivery Notes', category: 'Navigation', icon: Package, action: () => navigate('/delivery-notes') },
    { id: 'nav-si', title: 'Sales Invoices', category: 'Navigation', icon: DollarSign, action: () => navigate('/sales-invoices') },
    { id: 'nav-pe', title: 'Payment Entries', category: 'Navigation', icon: DollarSign, action: () => navigate('/payments') },
    { id: 'nav-reports', title: 'Reports Hub', category: 'Navigation', icon: TrendingUp, action: () => navigate('/reports') },

    // Reports
    { id: 'rep-pl', title: 'Profit and Loss Statement', category: 'Reports', icon: TrendingUp, action: () => navigate('/reports/profit-and-loss'), shortcut: 'P&L' },
    { id: 'rep-gp', title: 'Gross Profit Report', category: 'Reports', icon: DollarSign, action: () => navigate('/reports/gross-profit') },
    { id: 'rep-bs', title: 'Balance Sheet', category: 'Reports', icon: TrendingUp, action: () => navigate('/reports/balance-sheet') },
    { id: 'rep-tb', title: 'Trial Balance', category: 'Reports', icon: FileText, action: () => navigate('/reports/trial-balance') },
    { id: 'rep-gl', title: 'General Ledger', category: 'Reports', icon: Layers, action: () => navigate('/reports/general-ledger') },
    { id: 'rep-sl', title: 'Stock Ledger', category: 'Reports', icon: Package, action: () => navigate('/reports/stock-ledger') },
    { id: 'rep-sb', title: 'Stock Balance', category: 'Reports', icon: Package, action: () => navigate('/reports/stock-balance') },
    { id: 'rep-sp', title: 'Stock Projected Qty', category: 'Reports', icon: Package, action: () => navigate('/reports/stock-projected-qty') },

    // Quick Actions
    { id: 'act-wo', title: '+ New Work Order', category: 'Actions', icon: Plus, action: () => navigate('/work-orders') },
    { id: 'act-transfer', title: '+ Material Transfer', category: 'Actions', icon: Plus, action: () => navigate('/stock-entries') },
    { id: 'act-mfg', title: '+ Finish Batch (Manufacture)', category: 'Actions', icon: Plus, action: () => navigate('/stock-entries') },
    { id: 'act-dn', title: '+ New Delivery Note', category: 'Actions', icon: Plus, action: () => navigate('/delivery-notes') },
    { id: 'act-si', title: '+ New Sales Invoice', category: 'Actions', icon: Plus, action: () => navigate('/sales-invoices') },
    { id: 'act-pe', title: '+ Receive Payment', category: 'Actions', icon: Plus, action: () => navigate('/payments') },
  ];

  const filtered = items.filter((it) =>
    it.title.toLowerCase().includes(query.toLowerCase()) ||
    it.category.toLowerCase().includes(query.toLowerCase()) ||
    (it.shortcut && it.shortcut.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + (filtered.length || 1)) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filtered[selectedIndex];
        if (selected) {
          selected.action();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filtered, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl card shadow-2xl overflow-hidden border border-line animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-line gap-3 bg-card2">
          <Search size={16} className="text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, report, or jump to page… (↑↓ to navigate, Enter to select)"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            className="w-full bg-transparent border-none outline-none text-sm text-fg placeholder:text-muted"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] bg-card border border-line rounded text-muted">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-line/20">
          {!filtered.length ? (
            <p className="text-center text-xs text-muted py-8">No results found for &ldquo;{query}&rdquo;</p>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => { item.action(); onClose(); }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-hover text-fg font-medium' : 'text-muted hover:text-fg'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${isSelected ? 'bg-primary/20 text-primary' : 'bg-card2 text-muted'}`}>
                      <Icon size={14} />
                    </div>
                    <span className="text-xs text-fg">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.shortcut && (
                      <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-card2 text-muted border border-line">
                        {item.shortcut}
                      </kbd>
                    )}
                    <span className="text-[10px] text-muted uppercase tracking-wider">{item.category}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
