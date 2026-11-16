import { useEffect } from 'react';

/**
 * Remembers what had focus when a dialog or panel opened, and gives focus back to it when that closes, so keyboard
 * and screen-reader users land where they were. If the original element has gone (a launcher button that was hidden
 * while the panel was open), `fallbackSelector` names something else to focus. Call it before anything moves focus.
 */
export function useRestoreFocus(active = true, fallbackSelector) {
  useEffect(() => {
    if (!active) return undefined;
    const previous = document.activeElement;
    return () => {
      const target = previous && previous !== document.body && document.contains(previous) ? previous : fallbackSelector ? document.querySelector(fallbackSelector) : null;
      target?.focus?.();
    };
  }, [active, fallbackSelector]);
}
