import { useCallback, useEffect, useState } from 'react';

/**
 * True while the scrollable element has more to scroll to below. Use it to show a fade at the bottom,
 * so a short window does not hide links without saying so.
 */
export function useScrollCue(ref, slack = 4) {
  const [more, setMore] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (el) setMore(el.scrollHeight - el.clientHeight - el.scrollTop > slack);
  }, [ref, slack]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    // The element's own size changes with the window; its content changes when a button appears or a list grows.
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    if (observer) {
      observer.observe(el);
      for (const child of el.children) observer.observe(child);
    }
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [ref, measure]);

  return more;
}
