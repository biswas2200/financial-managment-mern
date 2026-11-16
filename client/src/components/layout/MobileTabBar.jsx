import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { Ellipsis } from 'lucide-react';
import { MOBILE_TABS } from './nav.js';

/** The phone's bottom bar: four everyday places, each icon in its own colour, and More for everything else. */
export function MobileTabBar({ onMore, moreOpen }) {
  const { pathname } = useLocation();
  const onTab = MOBILE_TABS.some((t) => (t.end ? pathname === t.to : pathname === t.to || pathname.startsWith(`${t.to}/`)));
  const tabClass = (active) => clsx('flex flex-col items-center gap-0.5 py-2 text-[0.6875rem] font-medium', active ? 'text-brand' : 'text-ink-3');
  const pill = (active) =>
    clsx('flex h-7 w-12 items-center justify-center rounded-full transition-[background-color,transform] duration-200', active ? 'tab-pill-on scale-105' : 'active:scale-90');
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 bg-surface/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_var(--line),0_-10px_24px_-14px_rgb(21_27_51/0.3)] backdrop-blur-md lg:hidden"
    >
      {MOBILE_TABS.map(({ to, label, icon: Icon, end, color }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => tabClass(isActive)}>
          {({ isActive }) => (
            <>
              <span className={pill(isActive)} style={{ '--chip': color }}>
                <Icon size={20} aria-hidden style={{ color }} />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
      <button type="button" onClick={onMore} aria-haspopup="dialog" aria-expanded={moreOpen} className={tabClass(!onTab)}>
        <span className={pill(!onTab)} style={{ '--chip': 'var(--brand)' }}>
          <Ellipsis size={20} aria-hidden />
        </span>
        More
      </button>
    </nav>
  );
}
