import { useEffect, useRef } from 'react';

const TYPING = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Single-key shortcuts such as { n: openAdd, '/': focusSearch }.
 * Ignored while the user is typing in a field or holding Ctrl/Cmd/Alt,
 * so browser shortcuts and normal typing are never hijacked.
 */
export function useHotkeys(map, { enabled = true } = {}) {
  const handlers = useRef(map);
  handlers.current = map;

  useEffect(() => {
    if (!enabled) return undefined;
    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target && (target.isContentEditable || TYPING.has(target.tagName))) return;
      const handler = handlers.current[event.key];
      if (!handler) return;
      event.preventDefault();
      handler(event);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
