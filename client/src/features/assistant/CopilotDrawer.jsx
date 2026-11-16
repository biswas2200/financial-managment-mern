import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '../../components/ui/primitives.jsx';
import { useRestoreFocus } from '../../hooks/useRestoreFocus.js';
import { CopilotChat } from './CopilotChat.jsx';

const CopilotContext = createContext({ open: () => {}, close: () => {}, isOpen: false });

/** `open(question?)` slides Copilot in from any page, optionally with a question for it to answer straight away. */
export const useCopilot = () => useContext(CopilotContext);

function Drawer({ prompt, onPromptConsumed, onClose }) {
  const ref = useRef(null);
  useRestoreFocus(true, '[data-copilot-launcher]'); // before the dialog takes focus
  // A native modal dialog sits in the browser's top layer, so it also opens above an article or post that is already open.
  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label="Copilot"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className="drawer-in m-0 ml-auto h-dvh max-h-none w-full max-w-[440px] overflow-hidden bg-paper p-0 text-ink shadow-raise-2"
    >
      <div className="relative flex h-full flex-col">
        <Button variant="ghost" size="icon" aria-label="Close Copilot" onClick={onClose} className="absolute top-2.5 right-3 z-10">
          <X size={18} />
        </Button>
        <CopilotChat compact className="h-full [&>div:first-child]:pr-14" initialPrompt={prompt} onPromptConsumed={onPromptConsumed} />
      </div>
    </dialog>
  );
}

export function CopilotProvider({ children }) {
  const [state, setState] = useState({ isOpen: false, prompt: null });
  const open = useCallback((prompt) => setState({ isOpen: true, prompt: prompt?.trim() || null }), []);
  const close = useCallback(() => setState({ isOpen: false, prompt: null }), []);
  const consumed = useCallback(() => setState((s) => ({ ...s, prompt: null })), []);
  const value = useMemo(() => ({ open, close, isOpen: state.isOpen }), [open, close, state.isOpen]);

  return (
    <CopilotContext.Provider value={value}>
      {children}
      {state.isOpen && <Drawer prompt={state.prompt} onPromptConsumed={consumed} onClose={close} />}
    </CopilotContext.Provider>
  );
}

/**
 * Floating button that opens Copilot in a side panel from any page.
 * Hidden on phones: the bottom tab bar already has a Copilot tab, and the button covered amounts and actions.
 * Elsewhere it is a round icon rather than a labelled pill, so it stays clear of the Amount column in tables.
 */
export function CopilotLauncher() {
  const { open, isOpen } = useCopilot();
  if (isOpen) return null;
  return (
    <button
      type="button"
      data-copilot-launcher
      onClick={() => open()}
      aria-label="Ask Copilot"
      title="Ask Copilot"
      className="fixed right-4 bottom-20 z-40 hidden h-12 w-12 items-center justify-center rounded-full bg-ink text-paper shadow-[var(--shadow-pop)] hover:opacity-90 sm:inline-flex lg:right-8 lg:bottom-8"
    >
      <MessageCircle size={20} aria-hidden />
    </button>
  );
}
