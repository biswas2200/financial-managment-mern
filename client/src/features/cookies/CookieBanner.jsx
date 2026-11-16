import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Cookie } from 'lucide-react';
import { useMe } from '../../api/hooks.js';
import { Button } from '../../components/ui/primitives.jsx';
import { useCookieConsent } from './CookieConsentProvider.jsx';

/**
 * Asks, once, about the optional cookies. It sits at the edge of the page without blocking it, and both answers
 * are the same size. It stays until you answer, and nothing optional is used in the meantime.
 */
export function CookieBanner() {
  const { decided, decide } = useCookieConsent();
  const { data: user } = useMe();
  if (decided) return null;

  return (
    <section
      aria-label="Cookies"
      className={clsx(
        'fixed inset-x-3 z-40 rounded-2xl bg-surface p-4 text-ink shadow-[var(--shadow-pop)] ring-1 ring-line sm:max-w-md',
        // Signed in, the phone tab bar is at the bottom and the sidebar is at the left of a laptop screen.
        user ? 'bottom-24 sm:right-auto sm:left-4 lg:bottom-6 lg:left-[17.5rem]' : 'bottom-3 sm:right-auto sm:left-4 lg:bottom-6 lg:left-6',
      )}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Cookie size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="font-wide text-[0.9375rem] font-semibold">Cookies on Kosha</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            Kosha sets one cookie, to keep you signed in. It is essential, so it is always on. With your OK, Kosha also remembers choices like your theme on this device. There are no advertising or tracking cookies.{' '}
            <Link to="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button size="sm" variant="secondary" onClick={() => decide(false)}>
          Essential only
        </Button>
        <Button size="sm" onClick={() => decide(true)}>
          Accept all
        </Button>
      </div>
    </section>
  );
}
