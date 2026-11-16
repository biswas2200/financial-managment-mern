import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { User, SlidersHorizontal, Tags, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/layout/AppShell.jsx';

const TABS = [
  { to: '/settings', label: 'Profile', icon: User, end: true },
  { to: '/settings/preferences', label: 'Preferences', icon: SlidersHorizontal },
  { to: '/settings/categories', label: 'Categories', icon: Tags },
  { to: '/settings/privacy', label: 'Privacy & data', icon: ShieldCheck },
];

/** Settings is a handful of short pages instead of one long scroll; this holds the title and the links between them. */
export default function SettingsLayout() {
  return (
    <>
      <PageHeader title="Settings" description="Your profile, categories, preferences and privacy." />
      <nav aria-label="Settings sections" className="no-scrollbar -mx-4 mb-5 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[0.9375rem] font-medium transition-[background-color,color] duration-200',
                isActive ? 'bg-brand-soft text-brand shadow-inset' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
              )
            }
          >
            <Icon size={16} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="raised rounded-2xl bg-surface px-5 py-8 shadow-raise-1 sm:px-8">
        <Outlet />
      </div>
    </>
  );
}
