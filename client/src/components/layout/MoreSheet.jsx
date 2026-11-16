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
      className="sheet-in m-0 mt-auto max-h-[86dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-surface p-0 text-ink shadow-raise-2 lg:hidden"
    >
      {open && (
        <div className="px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" />
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-wide text-lg font-semibold">More</h2>
            <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X size={18} />
            </Button>
          </div>
          <div className="flex flex-col gap-5">
            {MORE_SECTIONS.map((section) => (
              <section key={section.id}>
                <h3 className="mb-2 text-sm font-semibold text-ink-3">{section.label}</h3>
                <ul className="grid grid-cols-3 gap-2">
                  {section.items.map(({ to, label, icon: Icon }) => (
                    <li key={to}>
                      <Link
                        to={to}
                        onClick={onClose}
                        className="btn-3d-soft flex h-full flex-col items-center gap-1.5 rounded-xl bg-surface px-2 py-3 text-center text-[0.8125rem] font-medium text-ink hover:bg-surface-2"
                      >
                        <Icon size={20} aria-hidden className="text-brand" />
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
