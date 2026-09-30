import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  LayoutGrid,
  AppWindow,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useFrappeAuth, useFrappeGetDoc, useSWRConfig } from 'frappe-react-sdk';
import { LABELS } from '@/constants/labels';
import { useTheme } from '@/contexts/ThemeContext';
import { CommandPalette } from './CommandPalette';

interface TopbarProps {
  title: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  actions?: React.ReactNode;
}

interface UserDoc {
  name: string;
  full_name?: string;
  email?: string;
}

export function Topbar({ title, searchValue, onSearchChange, actions }: TopbarProps) {
  const navigate = useNavigate();
  const { currentUser, logout } = useFrappeAuth();
  const { mutate } = useSWRConfig();
  const { theme, setTheme } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  // Fetch user full name from ERPNext User doc
  const { data: userDoc } = useFrappeGetDoc<UserDoc>(
    'User',
    currentUser ?? '',
    currentUser ? `user-info-${currentUser}` : null,
  );

  const fullName = userDoc?.full_name || currentUser || 'Administrator';
  const siteName =
    (window as unknown as { frappe?: { boot?: { sitename?: string } } }).frappe?.boot?.sitename ||
    window.location.hostname ||
    'frappe.local';

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2) || 'U';

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setThemeOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setThemeOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };

    document.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear SWR cache and any portal state
      try {
        await mutate(() => true, undefined, { revalidate: false });
      } catch {
        // Ignore cache clear errors during logout
      }
      // Hard redirect to standard Frappe login page with no parameters
      window.location.replace('/login');
    }
  };

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <>
      <header
        className="fixed top-0 left-60 right-0 h-16 backdrop-blur-md border-b flex items-center gap-4 px-6 z-20 transition-colors"
        style={{ background: 'var(--topbar-bg)', borderColor: 'var(--topbar-border)' }}
      >
        <h1 className="text-base font-bold text-fg flex-shrink-0">{title}</h1>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative max-w-xs w-full flex items-center">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            id="topbar-search"
            type="search"
            placeholder={LABELS.search}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input-field pl-9 pr-12 h-9 border"
            style={{ borderColor: 'var(--border)' }}
          />
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] rounded bg-card2 border border-line text-muted hover:text-fg font-mono transition-colors"
            title="Open Command Palette (Cmd+K)"
          >
            ⌘K
          </button>
        </div>

        {/* Theme Toggle */}
        <div className="relative" ref={themeRef}>
          <button
            id="topbar-theme"
            onClick={() => setThemeOpen((p) => !p)}
            className="p-2 rounded-lg text-muted hover:text-fg transition-colors"
            style={{ background: themeOpen ? 'var(--bg-hover)' : undefined }}
            aria-label="Change theme"
          >
            <ThemeIcon size={16} />
          </button>
          {themeOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-36 card border py-1 animate-fade-in shadow-2xl rounded-xl z-50"
              style={{ borderColor: 'var(--border)' }}
            >
              {(['light', 'dark', 'system'] as const).map((t) => {
                const Icon = t === 'light' ? Sun : t === 'dark' ? Moon : Monitor;
                return (
                  <button
                    key={t}
                    onClick={() => { setTheme(t); setThemeOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted hover:text-fg transition-colors capitalize"
                    style={{ color: theme === t ? 'var(--primary)' : undefined, background: theme === t ? 'var(--bg-hover)' : undefined }}
                  >
                    <Icon size={13} />
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bell */}
        <button id="topbar-bell" className="p-2 rounded-lg text-muted hover:text-fg transition-colors" aria-label="Notifications">
          <Bell size={16} />
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            id="topbar-user-menu"
            onClick={() => setMenuOpen((p) => !p)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors"
            style={{ background: menuOpen ? 'var(--bg-hover)' : undefined }}
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
              style={{ background: 'var(--navy-600)', color: 'var(--primary-fg)' }}
            >
              {initials}
            </div>
            <span className="text-sm font-medium text-fg hidden sm:block max-w-[130px] truncate">
              {fullName}
            </span>
            <ChevronDown size={12} className={`text-muted transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              aria-orientation="vertical"
              className="absolute right-0 top-full mt-2 w-64 card border rounded-[16px] shadow-2xl py-2 animate-fade-in z-50 overflow-hidden"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
            >
              {/* Header block */}
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--divider)' }}>
                <p className="text-sm font-bold text-fg truncate leading-snug">{fullName}</p>
                <p className="text-xs text-muted truncate mt-0.5">
                  {LABELS.userMenu.connectedTo} {siteName}
                </p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                {/* 1. View Profile */}
                <button
                  id="user-menu-profile"
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-fg hover:bg-[var(--bg-hover)] transition-colors text-left"
                >
                  <User size={16} className="text-muted flex-shrink-0" />
                  <span>{LABELS.userMenu.viewProfile}</span>
                </button>

                {/* 2. Apps */}
                <button
                  id="user-menu-apps"
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    window.location.href = '/apps';
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-fg hover:bg-[var(--bg-hover)] transition-colors text-left"
                >
                  <LayoutGrid size={16} className="text-muted flex-shrink-0" />
                  <span>{LABELS.userMenu.apps}</span>
                </button>

                {/* 3. Switch to Desk */}
                <button
                  id="user-menu-desk"
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    window.location.href = '/app';
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-fg hover:bg-[var(--bg-hover)] transition-colors text-left"
                >
                  <AppWindow size={16} className="text-muted flex-shrink-0" />
                  <span>{LABELS.userMenu.switchToDesk}</span>
                </button>
              </div>

              {/* Thin divider */}
              <div className="border-t my-1" style={{ borderColor: 'var(--divider)' }} />

              {/* 5. Sign Out */}
              <div className="py-1">
                <button
                  id="user-menu-logout"
                  role="menuitem"
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left hover:bg-[var(--bg-hover)]"
                  style={{ color: 'var(--accent)' }}
                >
                  <LogOut size={16} className="flex-shrink-0" style={{ color: 'var(--accent)' }} />
                  <span>{LABELS.userMenu.signOut}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
