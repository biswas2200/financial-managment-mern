import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CONSENT_KEY,
  readConsent,
  saveConsent,
  preferencesAllowed,
  readPreference,
  writePreference,
  removePreference,
  subscribeConsent,
  reconcileConsent,
} from './consent.js';

beforeEach(() => localStorage.clear());

describe('The stored cookie choice', () => {
  it('is nothing until the person has chosen', () => {
    expect(readConsent()).toBeNull();
    expect(preferencesAllowed()).toBe(false);
  });

  it('remembers a yes, with when it was made and which list of items it was made against', () => {
    const before = Date.now();
    const saved = saveConsent({ preferences: true });
    expect(saved).toMatchObject({ preferences: true });
    expect(new Date(saved.decidedAt).getTime()).toBeGreaterThanOrEqual(before - 5);
    expect(readConsent()).toEqual(saved);
    expect(preferencesAllowed()).toBe(true);
  });

  it('keeps the time it is given, so a choice adopted from the account keeps its original time', () => {
    const saved = saveConsent({ preferences: false, decidedAt: '2026-11-10T08:00:00.000Z' });
    expect(saved.decidedAt).toBe('2026-11-10T08:00:00.000Z');
    expect(preferencesAllowed()).toBe(false);
  });

  it('treats a damaged or odd value as no choice at all, so the banner asks again', () => {
    for (const raw of ['not json', '{"preferences":"yes"}', '[]', 'null', '{"decidedAt":"2026-01-01T00:00:00.000Z"}']) {
      localStorage.setItem(CONSENT_KEY, raw);
      expect(readConsent(), raw).toBeNull();
      expect(preferencesAllowed()).toBe(false);
    }
  });

  it('tells anything that is listening, so the banner and the theme change as soon as you answer', () => {
    const listener = vi.fn();
    const stop = subscribeConsent(listener);
    saveConsent({ preferences: true });
    expect(listener).toHaveBeenCalled();
    listener.mockClear();
    stop();
    saveConsent({ preferences: false });
    expect(listener).not.toHaveBeenCalled();
  });

  it('follows a choice made in another tab', () => {
    const listener = vi.fn();
    subscribeConsent(listener);
    window.dispatchEvent(new StorageEvent('storage', { key: CONSENT_KEY }));
    expect(listener).toHaveBeenCalled();
  });
});

describe('Optional items in browser storage', () => {
  it('are not stored, and not read, until the person says yes', () => {
    expect(writePreference('kosha-theme', 'dark')).toBe(false);
    expect(localStorage.getItem('kosha-theme')).toBeNull();
    localStorage.setItem('kosha-theme', 'dark'); // left over from before
    expect(readPreference('kosha-theme')).toBeNull();
  });

  it('are stored and read once the person says yes', () => {
    saveConsent({ preferences: true });
    expect(writePreference('kosha-theme', 'dark')).toBe(true);
    expect(localStorage.getItem('kosha-theme')).toBe('dark');
    expect(readPreference('kosha-theme')).toBe('dark');
    removePreference('kosha-theme');
    expect(localStorage.getItem('kosha-theme')).toBeNull();
  });

  it('will not store anything that is not on the optional list', () => {
    saveConsent({ preferences: true });
    expect(writePreference('kosha-signed-in', '1')).toBe(false);
    expect(writePreference('random-key', 'x')).toBe(false);
    expect(localStorage.getItem('random-key')).toBeNull();
  });

  it('are cleared the moment the person says no, and only those', () => {
    saveConsent({ preferences: true });
    writePreference('kosha-theme', 'dark');
    writePreference('kosha-onboarding-hidden:abc123', '1');
    localStorage.setItem('kosha-signed-in', '1');
    saveConsent({ preferences: false });
    expect(localStorage.getItem('kosha-theme')).toBeNull();
    expect(localStorage.getItem('kosha-onboarding-hidden:abc123')).toBeNull();
    expect(localStorage.getItem('kosha-signed-in')).toBe('1'); // essential: untouched
    expect(localStorage.getItem(CONSENT_KEY)).not.toBeNull(); // the choice itself is kept
  });

  it('are left as they are when the answer stays yes', () => {
    saveConsent({ preferences: true });
    writePreference('kosha-theme', 'dark');
    saveConsent({ preferences: true });
    expect(localStorage.getItem('kosha-theme')).toBe('dark');
  });

  it('do not break when the browser refuses storage', () => {
    saveConsent({ preferences: true });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(writePreference('kosha-theme', 'dark')).toBe(false);
    set.mockRestore();
  });
});

describe('Which side wins when this device and the account disagree', () => {
  const at = (iso, preferences) => ({ preferences, decidedAt: iso });
  const old = '2026-11-10T08:00:00.000Z';
  const recent = '2026-11-12T08:00:00.000Z';

  it('does nothing when neither has an answer, or both agree', () => {
    expect(reconcileConsent(null, null)).toBe('none');
    expect(reconcileConsent(at(old, true), at(old, true))).toBe('none');
    expect(reconcileConsent(at(old, true), at(recent, true))).toBe('adopt'); // same answer, later time: take the later time
  });

  it('sends this device\'s answer to the account when the account has none', () => {
    expect(reconcileConsent(at(old, true), null)).toBe('push');
    expect(reconcileConsent(at(old, true), undefined)).toBe('push');
  });

  it('takes the account\'s answer when this device has none (a new device, or cleared site data)', () => {
    expect(reconcileConsent(null, at(old, false))).toBe('adopt');
  });

  it('follows whichever answer is newer', () => {
    expect(reconcileConsent(at(old, true), at(recent, false))).toBe('adopt');
    expect(reconcileConsent(at(recent, false), at(old, true))).toBe('push');
  });

  it('takes the account\'s answer when the times are the same but the answers differ', () => {
    expect(reconcileConsent(at(old, true), at(old, false))).toBe('adopt');
  });
});
