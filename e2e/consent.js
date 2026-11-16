/**
 * Most e2e tests are not about the cookie banner, so they start with the banner already answered ("yes to
 * preferences"), the way a returning visitor would. The cookie specs start from nothing instead.
 */
const choice = JSON.stringify({ preferences: true, decidedAt: '2026-01-01T00:00:00.000Z', version: '2026-11-16' });
const entry = { name: 'kosha-cookies', value: choice };

export const CONSENT_GIVEN = {
  cookies: [],
  origins: ['http://localhost:5173', 'http://localhost:4173'].map((origin) => ({ origin, localStorage: [entry] })),
};

export const NO_STORAGE = { cookies: [], origins: [] };

/** For scripts that set up a page by hand: run it before the page loads. */
export const answerBanner = () => localStorage.setItem('kosha-cookies', JSON.stringify({ preferences: true, decidedAt: '2026-01-01T00:00:00.000Z', version: '2026-11-16' }));
