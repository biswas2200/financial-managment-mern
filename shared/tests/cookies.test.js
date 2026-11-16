import { describe, it, expect } from 'vitest';
import { COOKIE_CATEGORIES, COOKIE_INVENTORY, COOKIE_CONSENT_VERSION, PREFERENCE_STORAGE_KEYS, cookieChoiceSchema, isPreferenceKey } from '../src/index.js';

describe('Cookie choice', () => {
  it('is a yes or a no for the optional cookies, with the moment it was made', () => {
    const parsed = cookieChoiceSchema.parse({ preferences: true, decidedAt: '2026-11-16T09:30:00.000Z' });
    expect(parsed).toEqual({ preferences: true, decidedAt: '2026-11-16T09:30:00.000Z' });
    expect(cookieChoiceSchema.parse({ preferences: false })).toEqual({ preferences: false });
  });

  it('refuses anything that is not a plain yes or no, so a request cannot smuggle in more', () => {
    for (const bad of [{}, { preferences: 'yes' }, { preferences: 1 }, { preferences: null }, { preferences: true, decidedAt: 'yesterday' }, { preferences: true, analytics: true }]) {
      expect(cookieChoiceSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });
});

describe('What Kosha keeps on your device', () => {
  it('has exactly two kinds: essential, which is always on, and preferences, which you choose', () => {
    expect(COOKIE_CATEGORIES.map((c) => c.id)).toEqual(['essential', 'preferences']);
    expect(COOKIE_CATEGORIES.find((c) => c.id === 'essential').always).toBe(true);
    expect(COOKIE_CATEGORIES.find((c) => c.id === 'preferences').always).toBe(false);
  });

  it('describes each item in plain words: what it is, what it is for, how long it lasts', () => {
    expect(COOKIE_INVENTORY.length).toBeGreaterThanOrEqual(5);
    for (const item of COOKIE_INVENTORY) {
      expect(COOKIE_CATEGORIES.map((c) => c.id), item.name).toContain(item.category);
      expect(['Cookie', 'Local storage', 'Session storage', 'Cache']).toContain(item.kind);
      expect(item.name.trim().length, item.key).toBeGreaterThan(2);
      for (const field of ['purpose', 'lasts']) expect(item[field].trim().length, `${item.name}: ${field}`).toBeGreaterThan(8);
    }
    expect(new Set(COOKIE_INVENTORY.map((i) => i.name)).size).toBe(COOKIE_INVENTORY.length);
  });

  it('keeps the one cookie there is, the sign-in cookie, as essential, and nothing for advertising or tracking', () => {
    const cookies = COOKIE_INVENTORY.filter((i) => i.kind === 'Cookie');
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({ key: 'kosha_token', category: 'essential' });
    expect(JSON.stringify(COOKIE_INVENTORY)).not.toMatch(/analytics|advertis(e|ing) (cookie|id)|tracking id|fingerprint/i);
  });

  it('puts the theme and the hidden checklist under preferences, and the sign-in marker and the cookie choice under essential', () => {
    const by = Object.fromEntries(COOKIE_INVENTORY.map((i) => [i.key, i.category]));
    expect(by['kosha-theme']).toBe('preferences');
    expect(by['kosha-onboarding-hidden']).toBe('preferences');
    expect(by['kosha-signed-in']).toBe('essential');
    expect(by['kosha-cookies']).toBe('essential');
  });

  it('knows which storage keys are optional, so declining can clear exactly those', () => {
    expect(PREFERENCE_STORAGE_KEYS).toEqual(expect.arrayContaining(['kosha-theme', 'kosha-onboarding-hidden']));
    expect(isPreferenceKey('kosha-theme')).toBe(true);
    expect(isPreferenceKey('kosha-onboarding-hidden:64f0c0ffee')).toBe(true); // one per person
    expect(isPreferenceKey('kosha-signed-in')).toBe(false);
    expect(isPreferenceKey('kosha-cookies')).toBe(false);
    expect(isPreferenceKey('something-else')).toBe(false);
  });

  it('has a version, so people can be asked again if what Kosha keeps ever changes', () => {
    expect(COOKIE_CONSENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
