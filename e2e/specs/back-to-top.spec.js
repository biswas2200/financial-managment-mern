import { test, expect } from '@playwright/test';
import { registerNewUser } from './helpers.js';

test.use({ reducedMotion: 'reduce' });

const top = (page) => page.getByRole('button', { name: 'Back to top' });
const scrollY = (page) => page.evaluate(() => Math.round(window.scrollY));

async function scrollDown(page) {
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight }));
  await page.waitForTimeout(150);
}

test.describe('Back to top', () => {
  test('appears on a long page after you scroll down, takes you back up, and goes away', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await registerNewUser(page);
    await page.goto('/learn');
    await expect(page.getByRole('heading', { level: 1, name: 'Learn' })).toBeVisible();
    await expect(top(page)).toHaveCount(0); // nothing to go back to yet
    await scrollDown(page);
    expect(await scrollY(page)).toBeGreaterThan(600);
    await expect(top(page)).toBeVisible();
    await top(page).click();
    await expect.poll(() => scrollY(page)).toBeLessThan(5);
    await expect(top(page)).toHaveCount(0);
    await expect(page.locator('#main')).toBeFocused(); // Tab carries on from the top of the page
  });

  test('never covers the Copilot button, and sits above the tab bar on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await registerNewUser(page);
    await page.goto('/learn');
    await expect(page.getByRole('heading', { level: 2, name: 'Scams & safety' })).toBeVisible(); // the whole list has loaded
    await scrollDown(page);
    const a = await top(page).boundingBox();
    const b = await page.locator('[data-copilot-launcher]').boundingBox();
    const overlap = !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
    expect(overlap, 'the two buttons do not overlap').toBe(false);

    await page.setViewportSize({ width: 390, height: 780 });
    await scrollDown(page);
    await expect(top(page)).toBeVisible();
    const phone = await top(page).boundingBox();
    const bar = await page.getByRole('navigation', { name: 'Main' }).boundingBox();
    expect(phone.y + phone.height, 'above the tab bar').toBeLessThanOrEqual(bar.y);
  });

  test('is on the landing page and the legal pages too', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 700 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await scrollDown(page);
    await expect(top(page)).toBeVisible();
    await top(page).click();
    await expect.poll(() => scrollY(page)).toBeLessThan(5);

    await page.goto('/privacy');
    await scrollDown(page);
    await expect(top(page)).toBeVisible();
  });

  test('is not on a short page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto('/login');
    await scrollDown(page);
    await expect(top(page)).toHaveCount(0);
  });
});
