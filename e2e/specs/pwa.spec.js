import { test, expect } from '@playwright/test';
import { registerNewUser, PASSWORD } from './helpers.js';

/**
 * The installed app: the production build served by `npm run pwa` (http://localhost:4173), where the service worker runs.
 * Start it first (`npm run pwa`). If it is not running these tests are skipped, so the normal suite does not depend on it.
 */
const PWA = process.env.KOSHA_PWA_URL ?? 'http://localhost:4173';
let up = false;

test.describe('Installed app (production build)', () => {
  test.use({ baseURL: PWA, reducedMotion: 'reduce', serviceWorkers: 'allow' });

  test.beforeAll(async ({ request }) => {
    up = await request.get(PWA).then((r) => r.ok(), () => false);
  });
  test.beforeEach(() => test.skip(!up, `The production build is not running on ${PWA} (run "npm run pwa")`));

  const ready = async (page) => {
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    // The first load is not yet controlled by the worker; one reload brings it under control.
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  };

  test('the sign-in page has no demo-account helper in the production build', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.locator('[data-demo-hint]')).toHaveCount(0);
    await expect(page.getByText('Fill in demo account')).toHaveCount(0);
  });

  test('the manifest offers shortcuts for adding entries, Markets and Learn', async ({ request }) => {
    const manifest = await (await request.get(`${PWA}/manifest.webmanifest`)).json();
    const urls = manifest.shortcuts.map((s) => s.url);
    for (const u of ['/?add=expense', '/?add=income', '/markets', '/learn']) expect(urls).toContain(u);
    expect(manifest.display).toBe('standalone');
  });

  test('a service worker installs, holds the shell, and removes older caches', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    const names = await page.evaluate(() => caches.keys());
    expect(names).toContain('kosha-v3');
    expect(names.filter((n) => /^kosha-v[12]/.test(n))).toEqual([]);
  });

  test('a visitor can open the landing page, with its sketch, with no connection once it has been seen', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Know where every rupee goes.' })).toBeVisible();
    await ready(page);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Know where every rupee goes.' })).toBeVisible();
    await expect(page.getByRole('img', { name: /Mumbai, Delhi, Kolkata/ })).toBeVisible();
    await context.setOffline(false);
  });

  test('a signed-in person who reloads offline is told they are offline, not sent to sign in, and recovers online', async ({ page, context }) => {
    const user = await registerNewUser(page);
    await ready(page);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(user.name.split(' ')[0]);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: /you're offline/i })).toBeVisible();
    await expect(page).toHaveURL(`${PWA}/`);
    await context.setOffline(false);
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(user.name.split(' ')[0]);
  });

  test('public market figures are kept for offline reading, but nothing personal is', async ({ page, context }) => {
    await registerNewUser(page);
    await page.goto('/markets');
    const online = await page.evaluate(() => fetch('/api/v1/markets/overview').then((r) => (r.ok ? r.json() : null)));
    test.skip(!online, 'The market data sources are not reachable from here');
    await ready(page);
    await page.goto('/markets'); // under the worker's control now
    await expect(page.getByText(/End-of-day data from NSE India/)).toBeVisible();
    await page.evaluate(() => fetch('/api/v1/markets/overview')); // makes sure the worker has stored a copy

    await context.setOffline(true);
    const cached = await page.evaluate(() => fetch('/api/v1/markets/overview').then((r) => r.json()).catch(() => null));
    expect(cached?.asOf, 'the last end-of-day figures, with their date').toBe(online.asOf);
    const personal = await page.evaluate(() => fetch('/api/v1/transactions').then(() => 'answered').catch(() => 'failed'));
    expect(personal, 'money data is never served from the device').toBe('failed');
    const watchlist = await page.evaluate(() => fetch('/api/v1/watchlist').then(() => 'answered').catch(() => 'failed'));
    expect(watchlist).toBe('failed');
    await context.setOffline(false);
  });

  test('moving around the app while offline still shows market figures the worker has kept, with their date', async ({ page, context }) => {
    await registerNewUser(page);
    await ready(page);
    await page.goto('/markets/stocks/TCS'); // online: loads this page's code and lets the worker keep what it fetches
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/TATA CONSULTANCY/i, { timeout: 15_000 }).catch(() => test.skip(true, 'The market data sources are not reachable from here'));
    const kept = await page.evaluate(() => fetch('/api/v1/markets/stocks/INFY').then((r) => r.ok)); // a copy this tab has not asked for itself
    test.skip(!kept, 'The market data sources are not reachable from here');
    await context.setOffline(true);
    // A move inside the app, as clicking a link would do, to a page whose figures only the worker holds.
    await page.evaluate(() => {
      window.history.pushState({}, '', '/markets/stocks/INFY');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/INFOSYS/i);
    await expect(page.getByText(/End-of-day data from NSE India as of/)).toBeVisible();
    await context.setOffline(false);
  });

  test('searches are not kept on the device', async ({ page }) => {
    await registerNewUser(page);
    await page.evaluate(() => fetch('/api/v1/markets/stocks/search?q=zzsecretterm'));
    await ready(page);
    await page.evaluate(() => fetch('/api/v1/markets/stocks/search?q=zzsecretterm'));
    const kept = await page.evaluate(async () => {
      const urls = [];
      for (const name of await caches.keys()) for (const r of await (await caches.open(name)).keys()) urls.push(r.url);
      return urls;
    });
    expect(kept.some((u) => u.includes('zzsecretterm'))).toBe(false);
  });

  test('the whole app works from the production build: sign in, Learn, Markets, Discussions, More sheet on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const user = await registerNewUser(page);
    const bar = page.getByRole('navigation', { name: 'Main' });
    await bar.getByRole('link', { name: 'Markets' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Markets' })).toBeVisible();
    await bar.getByRole('button', { name: 'More' }).click();
    await page.getByRole('dialog', { name: 'More' }).getByRole('link', { name: 'Learn' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Learn' })).toBeVisible();
    await page.getByRole('link', { name: /Build an emergency fund/ }).click();
    await expect(page.getByRole('dialog', { name: /emergency fund/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await bar.getByRole('button', { name: 'More' }).click();
    await page.getByRole('dialog', { name: 'More' }).getByRole('link', { name: 'Discussions' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Discussions' })).toBeVisible();
    expect(user.password).toBe(PASSWORD);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
