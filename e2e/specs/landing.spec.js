import { test, expect } from '@playwright/test';
import { registerNewUser } from './helpers.js';

const CITIES = ['Mumbai', 'Delhi', 'Kolkata', 'Hyderabad', 'Bengaluru', 'Chennai'];

test.describe('Landing page and the sketch', () => {
  test.use({ reducedMotion: 'reduce' });

  test('visitors see the landing page at the front door and can start from it', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Know where every rupee goes.' })).toBeVisible();
    await page.getByRole('region', { name: 'Kosha' }).getByRole('link', { name: 'Create your account' }).click();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('other pages still send a visitor to sign in', async ({ page }) => {
    await page.goto('/budgets');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('a signed-in person sees the app at the front door, and the landing page again after signing out', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Neha');
    await expect(page.getByRole('heading', { name: 'Know where every rupee goes.' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Know where every rupee goes.' })).toBeVisible();
  });

  test('the skyline names six Indian cities and their landmarks', async ({ page }) => {
    await page.goto('/');
    const sketch = page.getByRole('img', { name: /Mumbai, Delhi, Kolkata, Hyderabad, Bengaluru and Chennai/ });
    await expect(sketch).toBeVisible();
    for (const city of CITIES) await expect(sketch.getByText(city, { exact: true })).toBeAttached();
    await expect(sketch.getByText('Howrah Bridge')).toBeAttached();
    await expect(sketch.getByText('Charminar')).toBeAttached();
  });

  test('the landing page describes the same four domains as the sidebar', async ({ page }) => {
    await page.goto('/');
    for (const name of ['Money', 'Invest', 'Learn & talk', 'Assistant']) await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
    await expect(page.getByRole('region', { name: 'What Kosha is honest about' })).toContainText('instead of showing made-up numbers');
  });

  test('the sign-in page has the sketch beside the form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.locator('.sketch-scene').first()).toBeVisible();
  });

  test('on a small phone the landing page does not scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('the dark theme draws the sketch in light ink on dark paper', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    const ink = await page.locator('.sketch-scene').first().evaluate((el) => getComputedStyle(el).getPropertyValue('--sk-ink').trim());
    expect(ink.toLowerCase()).toBe('#e9e6dc');
  });

  test('with reduced motion the drawing is finished and stands still', async ({ page }) => {
    await page.goto('/');
    const pan = page.locator('[data-motion="pan"]').first();
    await expect(pan).toBeAttached();
    expect(await pan.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    const dash = await page.locator('path[pathLength="1"]').first().evaluate((el) => getComputedStyle(el).strokeDashoffset);
    expect(parseFloat(dash)).toBe(0);
  });
});

test.describe('The sketch is alive', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the skyline pans, and the water ripples', async ({ page }) => {
    await page.goto('/');
    const pan = page.locator('[data-motion="pan"]').first();
    const x = () => pan.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
    const first = await x();
    await page.waitForTimeout(1500);
    const second = await x();
    expect(second, 'the strip has moved left').toBeLessThan(first);

    const ripple = page.locator('.sk-ripple').first();
    const r1 = await ripple.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
    await page.waitForTimeout(1200);
    const r2 = await ripple.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
    expect(r2).not.toBe(r1);
  });

  test('outlines draw themselves in rather than appearing at once', async ({ page }) => {
    await page.goto('/');
    const states = await page.locator('path.sk-draw').first().evaluate((el) => getComputedStyle(el).animationName);
    expect(states).toBe('sk-draw');
  });
});
