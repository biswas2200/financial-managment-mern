import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { ArrowUp } from 'lucide-react';

/** How far down the page you have to be before the button is worth showing. */
const SHOW_AFTER = 600;

const scrolledFar = () => typeof window !== 'undefined' && window.scrollY > SHOW_AFTER;

/**
 * A button that takes you back to the top of a long page. It only appears once you have scrolled a good way down.
 * It glides up, or jumps for people who asked their device for less motion, and it puts the keyboard at the start
 * of the page so Tab carries on from there.
 */
export function BackToTop({ className }) {
  const [visible, setVisible] = useState(scrolledFar);

  useEffect(() => {
    const onScroll = () => setVisible(scrolledFar());
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  const goUp = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    document.getElementById('main')?.focus({ preventScroll: true });
  };

  return (
    <button
      type="button"
      onClick={goUp}
      aria-label="Back to top"
      title="Back to top"
      className={clsx(
        'btn-3d-soft back-to-top fixed z-30 inline-flex h-11 items-center gap-1.5 rounded-full bg-surface px-3.5 text-sm font-semibold text-ink shadow-[var(--shadow-pop)] hover:bg-surface-2',
        className,
      )}
    >
      <ArrowUp size={18} aria-hidden />
      <span className="hidden sm:inline">Top</span>
    </button>
  );
}
