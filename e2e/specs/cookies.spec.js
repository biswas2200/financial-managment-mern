import { test, expect } from '@playwright/test';
import { registerNewUser, PASSWORD } from './helpers.js';
import { NO_STORAGE } from '../consent.js';

// These start from a browser that has never been asked.
test.use({ storageState: NO_STORAGE, reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });

const banner = (page) => page.getByRole('region', { name: 'Cookies' });
const stored = (page, key) => page.evaluate((k) => localStorage.getItem(k), key);
const choice = async (page) => JSON.parse((await stored(page, 'kosha-cookies')) ?? 'null');
const me = async (page) => (await (await page.request.get('/api/v1/auth/me')).json()).user;

async function signIn(page, { email, password }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

test.describe('Cookie banner', () => {
  test('asks a first-time visitor, on the front page and on sign in, and not again once answered', async ({ page }) => {
    await page.goto('/');
    await expect(banner(page)).toBeVisible();
    await expect(banner(page)).toContainText('one cookie');
    expect(await stored(page, 'kosha-cookies'), 'nothing is recorded before an answer').toBeNull();
    await page.getByRole('button', { name: 'Accept all' }).click();
    await expect(banner(page)).toHaveCount(0);
    expect((await choice(page)).preferences).toBe(true);
    await page.reload();
    await expect(banner(page)).toHaveCount(0);
    await page.goto('/login');
    await expect(banner(page)).toHaveCount(0);
  });

  test('sets nothing optional before an answer, and exactly one cookie after signing in', async ({ page, context }) => {
    await page.goto('/login');
    await expect(banner(page)).toBeVisible();
    await page.getByRole('button', { name: 'Switch to dark theme' }).or(page.getByRole('button', { name: /theme/i })).first().click().catch(() => {});
    expect(await stored(page, 'kosha-theme'), 'no theme is stored before a yes').toBeNull();
    await page.getByRole('button', { name: 'Essential only' }).click();
    await registerNewUser(page);
    const names = (await context.cookies()).map((c) => c.name);
    expect(names).toEqual(['kosha_token']);
    const [cookie] = await context.cookies();
    expect(cookie.httpOnly).toBe(true);
  });

  test('"Essential only" means the theme is not remembered, and any old copy is removed', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('kosha-theme', 'dark')); // left over from an earlier visit
    await page.getByRole('button', { name: 'Essential only' }).click();
    expect(await stored(page, 'kosha-theme')).toBeNull();
    expect((await choice(page)).preferences).toBe(false);
    await registerNewUser(page);
    await page.getByRole('button', { name: /dark theme/i }).first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark'); // it works for this visit
    expect(await stored(page, 'kosha-theme')).toBeNull(); // but is not kept
  });

  test('"Accept all" lets the theme be remembered', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Accept all' }).click();
    await registerNewUser(page);
    await page.getByRole('button', { name: /dark theme/i }).first().click();
    await expect.poll(() => stored(page, 'kosha-theme')).toBe('dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('does not sit on top of the sign-in button', async ({ page }) => {
    await page.goto('/login');
    await expect(banner(page)).toBeVisible();
    const a = await banner(page).boundingBox();
    const b = await page.getByRole('button', { name: 'Sign in' }).boundingBox();
    const overlap = !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
    expect(overlap).toBe(false);
  });
});

test.describe('The choice follows the account', () => {
  test('an answer given before signing up is kept with the new account', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: 'Accept all' }).click();
    await registerNewUser(page);
    await expect.poll(async () => (await me(page)).cookieConsent?.preferences).toBe(true);
    const server = (await me(page)).cookieConsent;
    expect(server.decidedAt).toBe((await choice(page)).decidedAt); // the same moment, so the two agree
  });

  test('on another device the same person is not asked again, and gets the same choice', async ({ page, browser }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Accept all' }).click();
    const account = await registerNewUser(page);
    await expect.poll(async () => (await me(page)).cookieConsent?.preferences).toBe(true);

    const phone = await browser.newContext({ locale: 'en-IN', reducedMotion: 'reduce', storageState: NO_STORAGE });
    const other = await phone.newPage();
    await other.goto('/login');
    await expect(banner(other)).toBeVisible(); // a device that has never been answered asks
    await signIn(other, account);
    await expect(banner(other)).toHaveCount(0); // and stops once it knows the account's answer
    await expect.poll(async () => (await choice(other))?.preferences).toBe(true);
    await other.getByRole('button', { name: /dark theme/i }).first().click();
    await expect.poll(() => stored(other, 'kosha-theme')).toBe('dark'); // so the theme is remembered there too
    await phone.close();
  });

  test('changing it in Settings reaches the account, and the other device follows', async ({ page, browser }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Accept all' }).click();
    const account = await registerNewUser(page);
    await expect.poll(async () => (await me(page)).cookieConsent?.preferences).toBe(true);

    const second = await browser.newContext({ locale: 'en-IN', reducedMotion: 'reduce', storageState: NO_STORAGE });
    const other = await second.newPage();
    await signIn(other, account);
    await expect.poll(async () => (await choice(other))?.preferences).toBe(true);
    await other.getByRole('button', { name: /dark theme/i }).first().click();
    await expect.poll(() => stored(other, 'kosha-theme')).toBe('dark');

    await page.goto('/settings/privacy');
    const toggle = page.getByRole('switch', { name: /remember my choices on this device/i });
    await expect(toggle).toBeChecked();
    await toggle.click();
    await expect(toggle).not.toBeChecked();
    await expect.poll(async () => (await me(page)).cookieConsent?.preferences).toBe(false);
    await expect(page.getByText(/kept with your account/i)).toBeVisible();

    await other.reload(); // the other device learns of it the next time it loads
    await expect.poll(async () => (await choice(other))?.preferences).toBe(false);
    expect(await stored(other, 'kosha-theme'), 'and forgets the theme it had kept').toBeNull();
    await second.close();
  });

  test('Settings lists everything Kosha keeps, and the privacy policy says the same', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Essential only' }).click();
    await registerNewUser(page);
    await page.goto('/settings/privacy');
    const region = page.getByRole('region', { name: 'Cookies and device storage' });
    for (const name of ['Sign-in cookie', 'Your cookie choice', 'Theme', 'Hidden getting-started card']) await expect(region.getByText(name, { exact: true })).toBeVisible();
    await page.goto('/privacy');
    await expect(page.getByText(/no advertising, analytics or tracking cookies/i).first()).toBeVisible();
  });

  test('is reachable on a phone above the tab bar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await page.goto('/login');
    await page.getByRole('button', { name: 'Essential only' }).click();
    await registerNewUser(page);
    await page.evaluate(() => localStorage.removeItem('kosha-cookies'));
    await page.reload();
    await expect(banner(page)).toBeVisible();
    const a = await banner(page).boundingBox();
    const bar = await page.getByRole('navigation', { name: 'Main' }).boundingBox();
    expect(a.y + a.height, 'above the tab bar').toBeLessThanOrEqual(bar.y);
  });
});
