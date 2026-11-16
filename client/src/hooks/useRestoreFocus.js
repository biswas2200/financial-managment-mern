import { useEffect, useState } from 'react';

/**
 * Remembers what had focus when a dialog or panel appeared, and gives focus back to it when that goes away, so keyboard
 * and screen-reader users land where they were. If the original element has gone (a launcher button that was hidden
 * while the panel was open), `fallbackSelector` names something else to focus.
 *
 * What had focus is read while the component first renders, which happens before anything moves focus into the dialog.
 * (Reading it in an effect would pick up the dialog's own button when React runs effects twice in development.)
 */
export function useRestoreFocus(active = true, fallbackSelector) {
  const [previous] = useState(() => (typeof document === 'undefined' ? null : document.activeElement));
  useEffect(() => {
    if (!active) return undefined;
    return () => {
      const usable = previous && previous !== document.body && document.contains(previous);
      const target = usable ? previous : fallbackSelector ? document.querySelector(fallbackSelector) : null;
      target?.focus?.();
    };
  }, [active, fallbackSelector, previous]);
}
