/**
 * The answer to the cookie banner, kept in this browser, and the rule that follows from it:
 * optional items (the theme, a hidden card) are stored only after a yes, and cleared the moment it becomes a no.
 * Essential items (the sign-in marker, this answer itself) are never touched here.
 *
 * What counts as optional comes from the one shared list (`COOKIE_INVENTORY`), so nothing is stored by accident.
 */
import { COOKIE_CONSENT_VERSION, isPreferenceKey } from '@kosha/shared';

export const CONSENT_KEY = 'kosha-cookies';
const CHANGED = 'kosha:consent';

/** A stored value as a choice, or null if it is missing or not a proper choice (the banner then asks again). */
export function parseConsent(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || typeof value.preferences !== 'boolean') return null;
    if (typeof value.decidedAt !== 'string' || Number.isNaN(Date.parse(value.decidedAt))) return null;
    return { preferences: value.preferences, decidedAt: value.decidedAt, version: value.version };
  } catch {
    return null;
  }
}

/** The raw stored text. Stable between calls, so React can compare it. */
export function rawConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

export const readConsent = () => parseConsent(rawConsent());
export const preferencesAllowed = () => readConsent()?.preferences === true;

function clearPreferences() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key && isPreferenceKey(key)) localStorage.removeItem(key);
    }
  } catch {
    /* storage is blocked: nothing was stored */
  }
}

/** Records an answer. A no clears every optional item already stored. Returns the choice that was saved. */
export function saveConsent({ preferences, decidedAt = new Date().toISOString() }) {
  const choice = { preferences, decidedAt, version: COOKIE_CONSENT_VERSION };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(choice));
  } catch {
    /* storage is blocked: the answer holds for this visit only */
  }
  if (!preferences) clearPreferences();
  window.dispatchEvent(new Event(CHANGED));
  return choice;
}

/** Calls `listener` when the answer changes here or in another tab. Returns a function that stops listening. */
export function subscribeConsent(listener) {
  const onStorage = (e) => {
    if (e.key === null || e.key === CONSENT_KEY) listener();
  };
  window.addEventListener(CHANGED, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGED, listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Reads an optional item. Nothing comes back unless the person has said yes. */
export function readPreference(key) {
  if (!preferencesAllowed() || !isPreferenceKey(key)) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Stores an optional item, only after a yes. Returns whether it was stored. */
export function writePreference(key, value) {
  if (!preferencesAllowed() || !isPreferenceKey(key)) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removePreference(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing to remove */
  }
}

/**
 * What to do when this device and the account have each recorded an answer: 'push' this device's answer to the
 * account, 'adopt' the account's answer here, or 'none'. The newer answer wins; at the same time, the account does.
 */
export function reconcileConsent(local, server) {
  if (!local && !server) return 'none';
  if (local && !server) return 'push';
  if (!local && server) return 'adopt';
  const here = Date.parse(local.decidedAt);
  const there = Date.parse(server.decidedAt);
  if (there > here) return 'adopt';
  if (here > there) return 'push';
  return local.preferences === server.preferences ? 'none' : 'adopt';
}
