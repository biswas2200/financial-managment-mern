import { useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Plus, LogOut, Keyboard, ArrowUpRight } from 'lucide-react';
import { Logo } from '../brand/Logo.jsx';
import { Button } from '../ui/primitives.jsx';
import { ThemeToggle } from '../ui/ThemeToggle.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { Kbd } from '../ui/Kbd.jsx';
import { useLogout, useMe } from '../../api/hooks.js';
import { useScrollCue } from '../../hooks/useScrollCue.js';
import { SidebarNav } from './SidebarNav.jsx';
import { SETTINGS_ITEM } from './nav.js';
import { InstallButton } from '../../pwa/InstallButton.jsx';

/**
 * The desktop sidebar. In a short window the whole thing scrolls as one piece, from the logo to your name,
 * the way the page does, with a fade at the bottom while there is more below.
 */
export function Sidebar({ onAdd, onShortcuts }) {
  const { data: user } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const asideRef = useRef(null);
  const more = useScrollCue(asideRef);

  return (
    <div className="rail hidden bg-rail text-rail-ink lg:block">
      <aside ref={asideRef} data-more={String(more)} className="rail-scroll sticky top-0 flex h-dvh flex-col overflow-y-auto overscroll-contain px-4 py-4">
        <div className="flex shrink-0 items-center justify-between pl-2">
          <Logo textClassName="text-rail-ink" />
          <ThemeToggle className="text-rail-ink-2 hover:bg-white/10 hover:text-rail-ink" />
        </div>

        <div className="mt-4 flex shrink-0 flex-col gap-1.5">
          <Button size="sm" className="h-9 w-full justify-between !bg-thread !text-[#2a1c00] hover:!brightness-105" onClick={() => onAdd('expense')} title="Shortcut: N">
            <span className="inline-flex items-center gap-2">
              <Plus size={18} aria-hidden />
              Add expense
            </span>
            <Kbd plain className="bg-black/10 text-[#2a1c00] ring-black/15">N</Kbd>
          </Button>
          <Button size="sm" className="h-9 w-full justify-between !bg-white/8 !text-rail-ink ring-1 ring-white/12 hover:!bg-white/14" onClick={() => onAdd('income')} title="Shortcut: I">
            <span className="inline-flex items-center gap-2">
              <ArrowUpRight size={18} aria-hidden />
              Add income
            </span>
            <Kbd plain className="bg-white/10 text-rail-ink ring-white/20">I</Kbd>
          </Button>
        </div>

        <SidebarNav />

        <div className="mt-2 shrink-0">
          <NavLink
            to={SETTINGS_ITEM.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-[10px] px-3 py-1.5 text-[0.9375rem] font-medium transition-colors',
                isActive ? 'bg-rail-2 text-white' : 'text-rail-ink-2 hover:bg-white/6 hover:text-rail-ink',
              )
            }
          >
            <SETTINGS_ITEM.icon size={18} aria-hidden />
            {SETTINGS_ITEM.label}
          </NavLink>
          <InstallButton className="mb-1 text-thread hover:bg-white/8" />
          <button
            type="button"
            onClick={onShortcuts}
            className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-rail-ink-2 hover:bg-white/8 hover:text-rail-ink"
          >
            <Keyboard size={16} aria-hidden />
            Keyboard shortcuts
            <Kbd plain className="ml-auto bg-white/10 text-rail-ink ring-white/20">?</Kbd>
          </button>
          <div className="flex items-center gap-3 rounded-xl border-t border-white/10 px-2 pt-2">
            <Avatar user={user} size={36} fallbackClassName="bg-thread text-[#2a1c00] shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_2px_6px_rgb(0_0_0/0.35)]" />
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
