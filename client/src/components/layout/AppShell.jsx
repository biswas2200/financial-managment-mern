import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ChartColumn,
  PiggyBank,
  MessageCircle,
  Settings,
  Plus,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { Logo, LogoMark } from '../brand/Logo.jsx';
import { Button } from '../ui/primitives.jsx';
import { useTheme } from '../../app/theme.jsx';
import { useLogout, useMe } from '../../api/hooks.js';
import { TransactionDialog } from '../../features/transactions/TransactionDialog.jsx';
import { CopilotLauncher } from '../../features/assistant/CopilotDrawer.jsx';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/analytics', label: 'Analytics', icon: ChartColumn },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/copilot', label: 'Copilot', icon: MessageCircle },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const QuickAddContext = createContext({ openAdd: () => {}, openEdit: () => {} });
export const useQuickAdd = () => useContext(QuickAddContext);

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  const dark = resolved === 'dark';
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  );
}

function Sidebar({ onAdd }) {
  const { data: user } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <div className="hidden border-r border-line bg-surface lg:block">
    <aside className="sticky top-0 flex h-dvh flex-col px-4 py-6">
      <div className="flex items-center justify-between pl-2">
        <Logo />
        <ThemeToggle />
      </div>

      <Button className="mt-8 w-full" onClick={onAdd}>
        <Plus size={18} aria-hidden />
        Add transaction
      </Button>

      <nav aria-label="Main" className="mt-6 flex flex-col gap-0.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[0.9375rem] font-medium transition-colors',
                isActive ? 'bg-brand-soft text-brand' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-thread" />}
                <Icon size={19} aria-hidden />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-3 rounded-xl px-2 py-2">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-ink"
        >
          {initials(user?.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user?.name}</p>
          <p className="truncate text-[0.8125rem] text-ink-3">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login') })}
        >
          <LogOut size={18} />
        </Button>
      </div>
    </aside>
    </div>
  );
}

function MobileTopbar({ onAdd }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
      <Logo size={26} />
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Button size="sm" onClick={onAdd} aria-label="Add transaction">
          <Plus size={16} aria-hidden />
          Add
        </Button>
      </div>
    </header>
  );
}

function MobileTabBar() {
  const items = NAV.filter((n) => n.to !== '/settings');
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            clsx('flex flex-col items-center gap-0.5 py-2 text-[0.6875rem] font-medium', isActive ? 'text-brand' : 'text-ink-3')
          }
        >
          <Icon size={20} aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell() {
  const [dialog, setDialog] = useState({ open: false, editing: null });
  const location = useLocation();

  const openAdd = useCallback(() => setDialog({ open: true, editing: null }), []);
  const openEdit = useCallback((txn) => setDialog({ open: true, editing: txn }), []);
  const quickAdd = useMemo(() => ({ openAdd, openEdit }), [openAdd, openEdit]);

  return (
    <QuickAddContext.Provider value={quickAdd}>
      <div className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <Sidebar onAdd={openAdd} />
        <div className="min-w-0">
          <MobileTopbar onAdd={openAdd} />
          <main id="main" className="mx-auto w-full max-w-[1320px] px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-9 lg:pb-14">
            <Outlet />
          </main>
        </div>
        <MobileTabBar />
        {location.pathname !== '/copilot' && <CopilotLauncher />}
      </div>
      <TransactionDialog
        open={dialog.open}
        editing={dialog.editing}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
      />
    </QuickAddContext.Provider>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 lg:mb-8">
      <div className="min-w-0">
        <h1 className="font-wide text-[1.75rem] leading-tight font-semibold tracking-[-0.01em] sm:text-[2.125rem]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[0.9375rem] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export { LogoMark };
