import { test, expect } from '@playwright/test';
import { registerNewUser, addTransaction } from './helpers.js';

test.use({ reducedMotion: 'no-preference' });

/** What the logo tile and its mark are painted with, read from the page. */
const logoPaint = (page) =>
  page.locator('aside svg').first().evaluate((svg) => [...svg.querySelectorAll('rect,circle,path')].map((el) => `${el.tagName}:${getComputedStyle(el).fill}:${getComputedStyle(el).stroke}`));

test.describe('Logo', () => {
  test('is the same black tile in the light and the dark theme, in the sidebar and the browser tab icon', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await registerNewUser(page);
    const paints = {};
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.reload();
      await expect(page.locator('aside svg').first()).toBeVisible();
      paints[scheme] = await logoPaint(page);
    }
    expect(paints.light).toEqual(paints.dark);
    expect(paints.light[0]).toMatch(/^rect:rgb\(11, 14, 28\)/); // the near-black tile
    const icon = await page.locator('link[rel="icon"]').first().getAttribute('href');
    expect(icon).toMatch(/favicon\.svg$/);
    const svg = await (await page.request.get(icon)).text();
    expect(svg).toContain('#0b0e1c');
    expect(svg).not.toMatch(/prefers-color-scheme|var\(/);
  });

  test('is the same on a phone as on a laptop', async ({ page }) => {
    await registerNewUser(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const phone = await page.locator('header svg').first().evaluate((svg) => [...svg.querySelectorAll('rect,circle,path')].map((el) => getComputedStyle(el).fill));
    await page.setViewportSize({ width: 1440, height: 900 });
    const laptop = await page.locator('aside svg').first().evaluate((svg) => [...svg.querySelectorAll('rect,circle,path')].map((el) => getComputedStyle(el).fill));
    expect(phone).toEqual(laptop);
  });
});

for (const scheme of ['light', 'dark']) {
  test.describe(`The skyline behind the app (${scheme} theme)`, () => {
    test.use({ colorScheme: scheme });

    test('stands still behind every page, faint, and never blocks a click', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await registerNewUser(page);
      for (const path of ['/', '/budgets', '/learn']) {
        await page.goto(path);
        const backdrop = page.locator('[data-still="true"].sketch-backdrop');
        await expect(backdrop).toHaveCount(1);
        const info = await backdrop.evaluate((el) => {
          const cs = getComputedStyle(el);
          const animated = [...el.querySelectorAll('*')].filter((n) => {
            const a = getComputedStyle(n);
            return a.animationName !== 'none' && a.animationDuration !== '0s';
          });
          return { position: cs.position, pointerEvents: cs.pointerEvents, opacity: Number(cs.opacity), paths: el.querySelectorAll('path').length, animated: animated.length, body: getComputedStyle(document.body).backgroundColor };
        });
        expect(info.position).toBe('fixed');
        expect(info.pointerEvents).toBe('none');
        expect(info.opacity).toBeGreaterThan(0.05);
        expect(info.opacity).toBeLessThan(0.3);
        expect(info.paths, `${path}: the city is drawn`).toBeGreaterThan(40);
        expect(info.animated, `${path}: nothing in it moves`).toBe(0);
        expect(info.body, 'the body does not paint over it').toBe('rgba(0, 0, 0, 0)');
      }
    });

    test('is the same city drawing in both themes, only the ink changes', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await registerNewUser(page);
      const d = await page.locator('.sketch-backdrop path').evaluateAll((paths) => paths.slice(0, 30).map((p) => p.getAttribute('d')));
      expect(d.length).toBeGreaterThan(10);
      await page.emulateMedia({ colorScheme: scheme === 'light' ? 'dark' : 'light' });
      await page.reload();
      const other = await page.locator('.sketch-backdrop path').evaluateAll((paths) => paths.slice(0, 30).map((p) => p.getAttribute('d')));
      expect(other).toEqual(d);
    });
  });
}

test.describe('Charts', () => {
  test('hovering a bar lights nothing but the bar: no grey band behind it', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await registerNewUser(page);
    await addTransaction(page, { amount: 450, category: 'Groceries', description: 'Weekly vegetables' });
    await page.goto('/analytics');
    const bars = page.locator('.recharts-bar-rectangle path, .recharts-bar-rectangle rect');
    await expect(bars.first()).toBeVisible();
    await bars.first().hover();
    await expect(page.locator('.recharts-tooltip-wrapper').filter({ hasText: /\d/ }).first()).toBeVisible(); // the hover really lit the tooltip
    expect(await page.locator('.recharts-tooltip-cursor').count()).toBe(0);
  });
});
