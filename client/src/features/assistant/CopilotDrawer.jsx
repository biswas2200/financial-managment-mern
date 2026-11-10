import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '../../components/ui/primitives.jsx';
import { CopilotChat } from './CopilotChat.jsx';

/** Floating button that opens Copilot in a side panel from any page. */
export function CopilotLauncher() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {!open && (
        <button
          type="button"
          data-copilot-launcher
          onClick={() => setOpen(true)}
          aria-label="Ask Copilot"
          className="fixed right-4 bottom-20 z-40 inline-flex h-12 w-12 items-center justify-center gap-2 rounded-full bg-ink text-[0.9375rem] font-semibold text-paper shadow-[var(--shadow-pop)] hover:opacity-90 sm:w-auto sm:pr-5 sm:pl-4 lg:right-8 lg:bottom-8"
        >
          <MessageCircle size={19} aria-hidden />
          <span className="hidden sm:inline">Ask Copilot</span>
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Copilot">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} aria-hidden />
          <div className="drawer-in relative flex h-full w-full max-w-[440px] flex-col bg-paper shadow-[var(--shadow-pop)] ring-1 ring-line">
            <Button variant="ghost" size="icon" aria-label="Close Copilot" onClick={() => setOpen(false)} className="absolute top-2.5 right-3 z-10">
              <X size={18} />
            </Button>
            <CopilotChat compact className="h-full [&>div:first-child]:pr-14" />
          </div>
        </div>
      )}
    </>
  );
}
