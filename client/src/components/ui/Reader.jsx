import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useRestoreFocus } from '../../hooks/useRestoreFocus.js';
import { Button } from './primitives.jsx';

/**
 * A large rectangular view that opens over the page, with the page blurred behind it, for reading an article
 * or a post and talking about it. It is a native modal dialog, so focus stays inside, Escape closes it, and
 * another modal (the Copilot drawer) can open on top of it. On a phone it fills the screen.
 */
export function Reader({ open, onClose, title, meta, children }) {
  const ref = useRef(null);
  const titleId = useId();
  useRestoreFocus(open); // before the dialog takes focus

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (e.target === ref.current) onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className="reader m-auto h-[min(92dvh,60rem)] max-h-none w-[min(100%,48rem)] overflow-hidden rounded-2xl bg-surface p-0 text-ink shadow-raise-2 max-sm:h-dvh max-sm:w-full max-sm:max-w-none max-sm:rounded-none"
    >
      {open && (
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-7">
            <div className="min-w-0">
              {meta && <p className="text-[0.8125rem] text-ink-3">{meta}</p>}
              <h2 id={titleId} className="mt-0.5 font-wide text-[1.375rem] leading-snug font-semibold text-balance [overflow-wrap:anywhere] sm:text-[1.625rem]">
                {title}
              </h2>
            </div>
            <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose} className="shrink-0">
              <X size={18} />
            </Button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 scrollbar-thin sm:px-7 sm:py-6">{children}</div>
        </div>
      )}
    </dialog>
  );
}
