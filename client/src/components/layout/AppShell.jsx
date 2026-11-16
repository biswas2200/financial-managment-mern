import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Logo, LogoMark } from '../brand/Logo.jsx';
import { Button, Dialog } from '../ui/primitives.jsx';
import { Kbd } from '../ui/Kbd.jsx';
import { useLogout, useMe } from '../../api/hooks.js';
import { useHotkeys } from '../../hooks/useHotkeys.js';
import { TransactionDialog } from '../../features/transactions/TransactionDialog.jsx';
import { CopilotLauncher, CopilotProvider } from '../../features/assistant/CopilotDrawer.jsx';
import { AccountMenu } from './AccountMenu.jsx';
import { Sidebar } from './Sidebar.jsx';
import { MobileTabBar } from './MobileTabBar.jsx';
import { AppBackdrop } from '../brand/sketch/AppBackdrop.jsx';
import { MoreSheet } from './MoreSheet.jsx';

const SHORTCUTS = [
  ['N', 'Add an expense'],
  ['I', 'Add income'],
  ['/', 'Search transactions (on the Transactions page)'],
  ['?', 'Show this list'],
  ['Esc', 'Close a dialog or menu'],
];

const QuickAddContext = createContext({ openAdd: () => {}, openEdit: () => {} });
export const useQuickAdd = () => useContext(QuickAddContext);

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

/**
 * Each page animates in when it first appears. An article, a post and the Settings tabs open inside their own page,
 * so they share its key: the list behind an article stays put (and keeps focus and scroll) instead of being rebuilt.
 */
export const pageKey = (pathname) => /^\/(learn|discussions|settings)(\/|$)/.exec(pathname)?.[1] ?? pathname;

export function AppShell() {
  const [dialog, setDialog] = useState({ open: false, editing: null, type: 'expense', date: undefined });
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  // Going to another page (a link, or the browser's Back button) closes the phone More sheet.
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);
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
    <CopilotProvider>
    <QuickAddContext.Provider value={quickAdd}>
      <div className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <AppBackdrop />
        <Sidebar onAdd={openAdd} onShortcuts={() => setShortcutsOpen(true)} />
        <div className="min-w-0">
          <MobileTopbar onAdd={openAdd} />
          <main id="main" className="mx-auto w-full max-w-[1320px] px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-9 lg:pb-14">
            <div key={pageKey(location.pathname)} className="page-in">
              <Outlet />
            </div>
          </main>
        </div>
        <MobileTabBar onMore={() => setMoreOpen(true)} moreOpen={moreOpen} />
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
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </QuickAddContext.Provider>
    </CopilotProvider>
  );
}

export { PageHeader } from './PageHeader.jsx';

export { LogoMark, Kbd };
