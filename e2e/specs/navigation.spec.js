import { test, expect } from '@playwright/test';
import { registerNewUser } from './helpers.js';

test.use({ reducedMotion: 'reduce' });

const PAGES = ['/', '/transactions', '/analytics', '/budgets', '/markets', '/markets/stocks', '/markets/funds', '/markets/watchlist', '/learn', '/discussions', '/copilot', '/settings', '/settings/categories', '/settings/privacy', '/settings/preferences'];

test.describe('Sidebar on a laptop', () => {
  test('is grouped by domain, with every place one click away, and Settings at the bottom', async ({ page }) => {
    await registerNewUser(page);
    const nav = page.getByRole('navigation', { name: 'Main' });
    for (const group of ['Money', 'Invest', 'Learn & talk', 'Assistant']) await expect(nav.getByRole('group', { name: group })).toBeVisible();
    for (const [name, url] of [['Stocks', /\/markets\/stocks$/], ['Mutual funds', /\/markets\/funds$/], ['Watchlist', /\/markets\/watchlist$/], ['Learn', /\/learn$/], ['Discussions', /\/discussions$/], ['Markets', /\/markets$/]]) {
      await nav.getByRole('link', { name, exact: true }).click();
      await expect(page).toHaveURL(url);
    }
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/settings$/);
  });

  test('a short window scrolls the links instead of cutting them off', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 560 });
    await registerNewUser(page);
    const nav = page.getByRole('navigation', { name: 'Main' });
    await nav.getByRole('link', { name: 'Discussions' }).scrollIntoViewIfNeeded();
    await expect(nav.getByRole('link', { name: 'Discussions' })).toBeVisible();
    const sidebar = await page.locator('aside').boundingBox();
    expect(sidebar.height).toBeLessThanOrEqual(560);
  });
});

test.describe('Phone: tab bar and the More sheet', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('four everyday tabs and More, and More lists the rest', async ({ page }) => {
    await registerNewUser(page);
    const bar = page.getByRole('navigation', { name: 'Main' });
    for (const name of ['Overview', 'Transactions', 'Markets', 'Copilot']) await expect(bar.getByRole('link', { name })).toBeVisible();
    await bar.getByRole('button', { name: 'More' }).click();
    const sheet = page.getByRole('dialog', { name: 'More' });
    for (const name of ['Analytics', 'Budgets', 'Stocks', 'Mutual funds', 'Watchlist', 'Learn', 'Discussions', 'Settings']) {
      await expect(sheet.getByRole('link', { name })).toBeVisible();
    }
    await sheet.getByRole('link', { name: 'Learn' }).click();
    await expect(page).toHaveURL(/\/learn$/);
    await expect(page.getByRole('dialog', { name: 'More' })).toHaveCount(0);
    await expect(bar.getByRole('button', { name: 'More' })).toHaveClass(/text-brand/); // More is lit while on a page that lives in it
  });

  test('an article fills the screen on a phone and can be read and closed', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/learn/emergency-fund');
    const dialog = page.getByRole('dialog', { name: /emergency fund/i });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(388);
    expect(box.height).toBeGreaterThanOrEqual(840);
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(page).toHaveURL(/\/learn$/);
  });
});

test.describe('Nothing scrolls sideways on a small phone', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

  test('any page', async ({ page }) => {
    await registerNewUser(page);
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.locator('#main')).toBeVisible();
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });
});
