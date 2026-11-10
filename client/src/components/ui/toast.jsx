import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CircleCheck, CircleAlert, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const show = useCallback(
    ({ message, tone = 'success', action, duration = 4500 }) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((list) => [...list.slice(-2), { id, message, tone, action }]);
      timers.current.set(id, setTimeout(() => dismiss(id), duration));
      return id;
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (message, opts) => show({ message, tone: 'success', ...opts }),
      error: (message, opts) => show({ message, tone: 'error', duration: 6000, ...opts }),
      dismiss,
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-paper shadow-[var(--shadow-pop)]"
          >
            {t.tone === 'error' ? (
              <CircleAlert size={18} className="shrink-0 text-bad" aria-hidden />
            ) : (
              <CircleCheck size={18} className="shrink-0 text-income" aria-hidden />
            )}
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="ml-1 rounded-md px-2 py-1 font-semibold text-paper underline underline-offset-2 hover:bg-white/10"
                onClick={() => {
                  t.action.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" aria-label="Dismiss" className="rounded p-1 opacity-70 hover:opacity-100" onClick={() => dismiss(t.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext) ?? { success: () => {}, error: () => {}, dismiss: () => {} };
}
