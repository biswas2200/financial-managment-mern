import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { MORE_SECTIONS } from './nav.js';
import { Button } from '../ui/primitives.jsx';

/** A bottom sheet for phones: every place in the app, since the tab bar only has room for four. */
export function MoreSheet({ open, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="More"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className="sheet-in no-scrollbar m-0 mt-auto max-h-[86dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-3xl bg-surface p-0 text-ink shadow-raise-2 lg:hidden"
    >
      {open && (
        <div className="pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <header className="sticky top-0 z-10 bg-surface px-4 pt-3 pb-2">
            <div aria-hidden className="mx-auto mb-2 h-1 w-10 rounded-full bg-line-strong" />
            <div className="flex items-center justify-between">
              <h2 className="font-wide text-lg font-semibold">More</h2>
              <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
                <X size={18} />
              </Button>
            </div>
          </header>
          <div className="flex flex-col gap-4 px-4 pt-1">
            {MORE_SECTIONS.map((section) => (
              <section key={section.id}>
                <h3 className="mb-1.5 text-[0.8125rem] font-semibold text-ink-3">{section.label}</h3>
                <ul className="grid grid-cols-4 gap-1.5">
                  {section.items.map(({ to, label, icon: Icon, color }) => (
                    <li key={to}>
                      <Link
                        to={to}
                        onClick={onClose}
                        className="flex h-full flex-col items-center gap-1 rounded-xl px-0.5 py-2 text-center text-[0.75rem] leading-tight font-medium text-ink transition-colors hover:bg-surface-2 active:bg-surface-2"
                      >
                        <span data-icon-chip aria-hidden style={{ color }} className="icon-chip flex size-10 items-center justify-center rounded-xl">
                          <Icon size={20} />
                        </span>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </dialog>
  );
}
