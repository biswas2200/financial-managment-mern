import { useId } from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { NAV_SECTIONS } from './nav.js';

function Group({ section }) {
  const headingId = useId();
  return (
    <div role="group" aria-labelledby={headingId} className="flex flex-col gap-0.5">
      <p id={headingId} className="px-3 pt-0.5 pb-0.5 text-[0.75rem] font-semibold tracking-[0.04em] text-rail-ink-2/70">
        {section.label}
      </p>
      {section.items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            clsx(
              'relative flex items-center gap-3 rounded-[10px] px-3 py-1.5 text-[0.9375rem] font-medium transition-[background-color,color,transform] duration-200',
              isActive ? 'rail-active bg-rail-2 text-white' : 'text-rail-ink-2 hover:translate-x-0.5 hover:bg-white/6 hover:text-rail-ink',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-thread" />}
              <Icon size={18} aria-hidden />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}

/** The desktop sidebar's links, one group per domain. The sidebar around it scrolls, not this list. */
export function SidebarNav() {
  return (
    <nav aria-label="Main" className="mt-4 flex flex-1 flex-col gap-3 pb-2">
      {NAV_SECTIONS.map((section) => (
        <Group key={section.id} section={section} />
      ))}
    </nav>
  );
}
