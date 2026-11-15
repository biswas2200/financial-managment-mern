import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
  Keyboard,
  ArrowUpRight,
} from 'lucide-react';
import { Logo, LogoMark } from '../brand/Logo.jsx';
import { Button, Dialog } from '../ui/primitives.jsx';
import { useTheme } from '../../app/theme.jsx';
import { useLogout, useMe } from '../../api/hooks.js';
import { useHotkeys } from '../../hooks/useHotkeys.js';
import { TransactionDialog } from '../../features/transactions/TransactionDialog.jsx';
import { CopilotLauncher } from '../../features/assistant/CopilotDrawer.jsx';
import { AccountMenu } from './AccountMenu.jsx';
import { InstallButton } from '../../pwa/InstallButton.jsx';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/analytics', label: 'Analytics', icon: ChartColumn },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/copilot', label: 'Copilot', icon: MessageCircle },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const SHORTCUTS = [
  ['N', 'Add an expense'],
  ['I', 'Add income'],
  ['/', 'Search transactions (on the Transactions page)'],
  ['?', 'Show this list'],
  ['Esc', 'Close a dialog or menu'],
];

const QuickAddContext = createContext({ openAdd: () => {}, openEdit: () => {} });
export const useQuickAdd = () => useContext(QuickAddContext);

export const Kbd = ({ children, className, inverse = false, plain = false }) => (
  <kbd
    className={clsx(
      'inline-flex min-w-6 items-center justify-center rounded-md px-1.5 py-0.5 font-sans text-[0.75rem] font-semibold ring-1',
      !plain && (inverse ? 'bg-white/20 text-brand-ink ring-white/30' : 'bg-surface-2 text-ink-2 ring-line-strong'),
      className,
    )}
  >
    {children}
  </kbd>
);

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

function ThemeToggle({ className }) {
  const { resolved, setTheme } = useTheme();
  const dark = resolved === 'dark';
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  );
}

function Sidebar({ onAdd, onShortcuts }) {
  const { data: user } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <div className="rail hidden bg-rail text-rail-ink lg:block">
      <aside className="sticky top-0 flex h-dvh flex-col px-4 py-6">
        <div className="flex items-center justify-between pl-2">
          <Logo textClassName="text-rail-ink" />
          <ThemeToggle className="text-rail-ink-2 hover:bg-white/10 hover:text-rail-ink" />
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <Button className="w-full justify-between !bg-thread !text-[#2a1c00] hover:!brightness-105" onClick={() => onAdd('expense')} title="Shortcut: N">
            <span className="inline-flex items-center gap-2">
              <Plus size={18} aria-hidden />
              Add expense
            </span>
            <Kbd plain className="bg-black/10 text-[#2a1c00] ring-black/15">N</Kbd>
          </Button>
          <Button className="w-full justify-between !bg-white/8 !text-rail-ink ring-1 ring-white/12 hover:!bg-white/14" onClick={() => onAdd('income')} title="Shortcut: I">
            <span className="inline-flex items-center gap-2">
              <ArrowUpRight size={18} aria-hidden />
              Add income
            </span>
            <Kbd plain className="bg-white/10 text-rail-ink ring-white/20">I</Kbd>
          </Button>
        </div>

        <nav aria-label="Main" className="mt-6 flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[0.9375rem] font-medium transition-[background-color,color,transform] duration-200',
                  isActive
                    ? 'rail-active bg-rail-2 text-white'
                    : 'text-rail-ink-2 hover:translate-x-0.5 hover:bg-white/6 hover:text-rail-ink',
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

        <div className="mt-auto">
          <InstallButton className="mb-1 text-thread hover:bg-white/8" />
          <button
            type="button"
            onClick={onShortcuts}
            className="mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rail-ink-2 hover:bg-white/8 hover:text-rail-ink"
          >
            <Keyboard size={16} aria-hidden />
            Keyboard shortcuts
            <Kbd plain className="ml-auto bg-white/10 text-rail-ink ring-white/20">?</Kbd>
          </button>
          <div className="flex items-center gap-3 rounded-xl border-t border-white/10 px-2 pt-3">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-thread text-sm font-semibold text-[#2a1c00] shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_2px_6px_rgb(0_0_0/0.35)]"
            >
              {initials(user?.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-[0.8125rem] text-rail-ink-2">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-rail-ink-2 hover:bg-white/10 hover:text-rail-ink"
              aria-label="Sign out"
              title="Sign out"
              onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login') })}
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function MobileTopbar({ onAdd }) {
  const { data: user } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-surface/85 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-raise-1 backdrop-blur-md lg:hidden">
      <Logo size={26} />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => onAdd('expense')}>
          <Plus size={16} aria-hidden />
          Add expense
        </Button>
        <AccountMenu user={user} onSignOut={() => logout.mutate(undefined, { onSettled: () => navigate('/login') })} />
      </div>
    </header>
  );
}

function MobileTabBar() {
  const items = NAV.filter((n) => n.to !== '/settings');
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 bg-surface/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_var(--line),0_-10px_24px_-14px_rgb(21_27_51/0.3)] backdrop-blur-md lg:hidden"
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
          {({ isActive }) => (
            <>
              <span
                className={clsx(
                  'flex h-7 w-12 items-center justify-center rounded-full transition-[background-color,transform] duration-200',
                  isActive ? 'scale-105 bg-brand-soft shadow-inset' : 'active:scale-90',
                )}
              >
                <Icon size={20} aria-hidden />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function ShortcutsDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} title="Keyboard shortcuts" description="Work faster without reaching for the mouse.">
      <ul className="divide-y divide-line">
        {SHORTCUTS.map(([key, action]) => (
          <li key={key} className="flex items-center justify-between gap-4 py-2.5 text-[0.9375rem]">
            <span>{action}</span>
            <Kbd>{key}</Kbd>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

export function AppShell() {
  const [dialog, setDialog] = useState({ open: false, editing: null, type: 'expense', date: undefined });
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  // `date` ('YYYY-MM-DD') starts the form on a past day, e.g. from the spending calendar.
  const openAdd = useCallback((type = 'expense', { date } = {}) => setDialog({ open: true, editing: null, type, date }), []);
  const openEdit = useCallback((txn) => setDialog({ open: true, editing: txn, type: txn.type }), []);
  const quickAdd = useMemo(() => ({ openAdd, openEdit }), [openAdd, openEdit]);

  // Home-screen shortcuts of the installed app open /?add=expense or /?add=income.
  useEffect(() => {
    const add = params.get('add');
    if (add !== 'expense' && add !== 'income') return;
    openAdd(add);
    const next = new URLSearchParams(params);
    next.delete('add');
    setParams(next, { replace: true });
  }, [params, setParams, openAdd]);

  useHotkeys(
    {
      n: () => openAdd('expense'),
      i: () => openAdd('income'),
      '?': () => setShortcutsOpen(true),
    },
    { enabled: !dialog.open && !shortcutsOpen },
  );

  return (
    <QuickAddContext.Provider value={quickAdd}>
      <div className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <Sidebar onAdd={openAdd} onShortcuts={() => setShortcutsOpen(true)} />
        <div className="min-w-0">
          <MobileTopbar onAdd={openAdd} />
          <main id="main" className="mx-auto w-full max-w-[1320px] px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-9 lg:pb-14">
            <div key={location.pathname} className="page-in">
              <Outlet />
            </div>
          </main>
        </div>
        <MobileTabBar />
        {location.pathname !== '/copilot' && <CopilotLauncher />}
      </div>
      <TransactionDialog
        open={dialog.open}
        editing={dialog.editing}
        defaultType={dialog.type}
        defaultDate={dialog.date}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
      />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
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
      {actions && <div className="flex flex-wrap items-center gap-2 max-sm:w-full">{actions}</div>}
    </div>
  );
}

export { LogoMark };
