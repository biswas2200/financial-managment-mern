import { useId } from 'react';
import { COOKIE_CATEGORIES, COOKIE_INVENTORY } from '@kosha/shared';
import { Switch } from '../../components/ui/Switch.jsx';
import { dateLong } from '../../lib/format.js';
import { useCookieConsent } from './CookieConsentProvider.jsx';

function status({ choice, signedIn, savedToAccount, saving }) {
  if (!choice) return 'You have not chosen yet, so only the essential items are used.';
  const when = dateLong(choice.decidedAt);
  if (signedIn && savedToAccount) return `You chose on ${when}. The choice is kept with your account, so it applies wherever you sign in.`;
  if (signedIn && saving) return `You chose on ${when}. Saving it to your account…`;
  if (signedIn) return `You chose on ${when}. It is only on this device so far. It is added to your account when Kosha can reach the server.`;
  return `You chose on ${when}. It is kept on this device. Sign in and it is kept with your account too.`;
}

/** What Kosha keeps on a device, and the one choice you have about it. */
export function CookieSettings() {
  const headingId = useId();
  const consent = useCookieConsent();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4 text-sm text-ink-2">
      <div>
        <h3 id={headingId} className="text-[0.9375rem] font-semibold text-ink">
          Cookies and device storage
        </h3>
        <p className="mt-1">Kosha sets one cookie, to keep you signed in, and keeps a little in your browser. There are no advertising, analytics or tracking cookies, and none from other companies.</p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-2 p-3.5">
        <div>
          <p className="font-semibold text-ink">Remember my choices on this device</p>
          <p className="mt-0.5">{status(consent)}</p>
        </div>
        <Switch checked={consent.preferencesAllowed} onChange={consent.decide} label="Remember my choices on this device" />
      </div>

      {COOKIE_CATEGORIES.map((category) => (
        <div key={category.id}>
          <h4 className="font-semibold text-ink">{category.label}</h4>
          <p className="mt-0.5">{category.summary}</p>
          <ul className="mt-2 divide-y divide-line rounded-xl ring-1 ring-line">
            {COOKIE_INVENTORY.filter((i) => i.category === category.id).map((item) => (
              <li key={item.key} className="px-3 py-2.5">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold text-ink">{item.name}</span>
                  <span className="text-[0.8125rem] text-ink-3">{item.kind}</span>
                </p>
                <p className="mt-0.5">{item.purpose}</p>
                <p className="mt-0.5 text-[0.8125rem] text-ink-3">Lasts: {item.lasts}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
