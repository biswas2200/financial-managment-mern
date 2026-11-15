import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { InstallButton } from '../../pwa/InstallButton.jsx';
import { Settings, Sun, Moon, LogOut, Keyboard } from 'lucide-react';
import { useTheme } from '../../app/theme.jsx';
import { Avatar } from '../ui/Avatar.jsx';

const itemClass =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[0.9375rem] text-ink hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none';

/** Avatar button that opens account actions: settings, theme, shortcuts and sign out. */
export function AccountMenu({ user, onSignOut, onShowShortcuts }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const { resolved, setTheme } = useTheme();
  const dark = resolved === 'dark';

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')];
        const i = items.indexOf(document.activeElement);
        const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items[next]?.focus();
      }
    };
    const onPointer = (e) => {
      if (!menuRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) close(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-full"
      >
        <Avatar user={user} size={36} />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Account"
          className="pop-in raised absolute right-0 z-50 mt-2 w-64 rounded-2xl bg-surface p-2 shadow-raise-2"
        >
          <div className="border-b border-line px-3 pt-1.5 pb-3">
            <p className="truncate font-semibold">{user?.name}</p>
            <p className="truncate text-[0.8125rem] text-ink-3">{user?.email}</p>
          </div>
          <div className="pt-1.5">
            <Link role="menuitem" to="/settings" className={itemClass} onClick={() => close(false)}>
              <Settings size={18} aria-hidden className="text-ink-2" />
              Settings
            </Link>
            <button role="menuitem" type="button" className={itemClass} onClick={() => setTheme(dark ? 'light' : 'dark')}>
              {dark ? <Sun size={18} aria-hidden className="text-ink-2" /> : <Moon size={18} aria-hidden className="text-ink-2" />}
              {dark ? 'Switch to light theme' : 'Switch to dark theme'}
            </button>
            {onShowShortcuts && (
              <button
                role="menuitem"
                type="button"
                className={itemClass}
                onClick={() => {
                  close(false);
                  onShowShortcuts();
                }}
              >
                <Keyboard size={18} aria-hidden className="text-ink-2" />
                Keyboard shortcuts
              </button>
            )}
            <InstallButton role="menuitem" className={`${itemClass} !font-semibold !text-brand`} />
            <button
              role="menuitem"
              type="button"
              className={itemClass}
              onClick={() => {
                close(false);
                onSignOut();
              }}
            >
              <LogOut size={18} aria-hidden className="text-ink-2" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
