/**
 * What Kosha keeps on your device, and the choice you make about the optional part.
 *
 * Kosha sets one cookie, to keep you signed in. It also uses a little browser storage. Some of it is essential
 * (without it Kosha cannot work) and some is only for your convenience, such as remembering your theme. You choose
 * about the second kind. There are no advertising, analytics or tracking cookies, and none from other companies.
 *
 * This list is the single source of truth: the banner, Settings, the Privacy Policy and the code that clears
 * storage when you say no all read it, so they cannot drift apart.
 */
import { z } from 'zod';

/** Change this date if what Kosha keeps ever changes, so people are asked again. */
export const COOKIE_CONSENT_VERSION = '2026-11-16';

export const COOKIE_CATEGORIES = [
  { id: 'essential', label: 'Essential', always: true, summary: 'Needed to keep you signed in and the app working. Always on.' },
  { id: 'preferences', label: 'Preferences', always: false, summary: 'Remembers your choices on this device, such as your theme. Optional.' },
];

export const COOKIE_INVENTORY = [
  {
    key: 'kosha_token',
    name: 'Sign-in cookie',
    kind: 'Cookie',
    category: 'essential',
    purpose: 'Keeps you signed in. It is httpOnly, so scripts on the page cannot read it, and SameSite.',
    lasts: 'Up to 7 days, or until you sign out',
  },
  {
    key: 'kosha-signed-in',
    name: 'Signed-in marker',
    kind: 'Local storage',
    category: 'essential',
    purpose: 'Lets the installed app tell "you are offline" from "you are signed out" when it opens without a connection.',
    lasts: 'Until you sign out',
  },
  {
    key: 'kosha-cookies',
    name: 'Your cookie choice',
    kind: 'Local storage',
    category: 'essential',
    purpose: 'Remembers your answer here, so Kosha does not ask again.',
    lasts: 'Until you clear site data',
  },
  {
    key: 'kosha-update-reload',
    name: 'Update guard',
    kind: 'Session storage',
    category: 'essential',
    purpose: 'Stops a page reloading again and again after an update. It holds one time stamp.',
    lasts: 'Until you close the tab',
  },
  {
    key: 'kosha-app-cache',
    name: 'Offline copy of the app',
    kind: 'Cache',
    category: 'essential',
    purpose: 'The installed app\'s screens and public end-of-day market figures, so it opens without a connection. Nothing personal is kept.',
    lasts: 'Until a newer version replaces it',
  },
  {
    key: 'kosha-theme',
    name: 'Theme',
    kind: 'Local storage',
    category: 'preferences',
    purpose: 'Remembers light, dark or "follow my device" on this device.',
    lasts: 'Until you clear site data',
  },
  {
    key: 'kosha-onboarding-hidden',
    name: 'Hidden getting-started card',
    kind: 'Local storage',
    category: 'preferences',
    purpose: 'Remembers that you closed the getting-started card on your overview.',
    lasts: 'Until you clear site data',
  },
];

/** The browser-storage keys that belong to the optional kind. Saying no clears exactly these. */
export const PREFERENCE_STORAGE_KEYS = COOKIE_INVENTORY.filter((i) => i.category === 'preferences' && i.kind === 'Local storage').map((i) => i.key);

/** True for an optional key, including ones that carry a person's id after a colon ("kosha-onboarding-hidden:abc"). */
export const isPreferenceKey = (key) => PREFERENCE_STORAGE_KEYS.some((k) => key === k || String(key).startsWith(`${k}:`));

/** A yes or no for the optional cookies, and when it was decided. Nothing else is accepted. */
export const cookieChoiceSchema = z
  .object({
    preferences: z.boolean(),
    decidedAt: z.string().datetime().optional(),
  })
  .strict();
