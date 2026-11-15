import { test, expect } from '@playwright/test';
import { registerNewUser } from './helpers.js';

// The chevron is the theme's muted ink (--ink-3) so it reads on the field but stays quiet.
const MUTED_INK = { light: 'rgb(100, 108, 135)', dark: 'rgb(132, 140, 168)' };

for (const scheme of ['light', 'dark']) {
  test.describe(`Dropdowns (${scheme} theme)`, () => {
    test.use({ colorScheme: scheme, reducedMotion: 'reduce' });

    test("open Kosha's own list instead of the browser's", async ({ page }) => {
      await registerNewUser(page);
      await page.goto('/transactions');
      const when = page.getByRole('combobox', { name: 'When' });
      await expect(when).toBeVisible();
      expect(await when.evaluate((el) => el.tagName), 'a styled control, not a <select>').toBe('BUTTON');

      const chevron = await when.locator('svg').evaluate((el) => getComputedStyle(el).color);
      expect(chevron, 'the chevron follows the theme').toBe(MUTED_INK[scheme]);

      await when.click();
      const list = page.getByRole('listbox');
      await expect(list).toBeVisible();
      await expect(list.getByRole('option', { name: 'This month' })).toBeVisible();
      await list.getByRole('option', { name: 'This month' }).click();
      await expect(list).toBeHidden();
      await expect(when).toContainText('This month');
    });

    test('stay inside the dialog they open from', async ({ page }) => {
      await registerNewUser(page);
      await page.goto('/budgets');
      await page.getByRole('button', { name: 'Add a budget' }).click();
      const dialog = page.getByRole('dialog', { name: 'Add a budget' });
      await dialog.getByRole('combobox', { name: 'Category' }).click();
      const list = page.getByRole('listbox');
      await expect(list).toBeVisible();
      const box = await list.boundingBox();
      const viewport = page.viewportSize();
      expect(box.y + box.height, 'fits on screen').toBeLessThanOrEqual(viewport.height);
      await expect(list.getByRole('option', { name: 'Groceries' })).toBeVisible();
      await expect(list.getByRole('option', { name: 'New category…' })).toBeVisible();
    });
  });
}

test.describe('Focus', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('charts never draw a hard box when they are focused', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/analytics');
    const chart = page.locator('svg.recharts-surface').first();
    await expect(chart).toBeVisible();
    await page.keyboard.press('Shift'); // keyboard modality, so :focus-visible applies
    await chart.focus();
    const style = await chart.evaluate((el) => {
      const s = getComputedStyle(el);
      return { focusVisible: el.matches(':focus-visible'), outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth };
    });
    expect(style.focusVisible, 'the chart really is keyboard-focused').toBe(true);
    expect(style.outlineStyle === 'none' || style.outlineWidth === '0px', 'no outline box around the chart').toBe(true);
  });

  test('the highlight eases in instead of snapping on', async ({ page }) => {
    await page.goto('/login');
    const email = page.getByLabel('Email');
    const button = page.getByRole('button', { name: 'Sign in' });
    await expect(email).toBeVisible();

    const seconds = (value) => Math.max(...value.split(',').map((v) => parseFloat(v)));
    const field = await email.evaluate((el) => {
      const s = getComputedStyle(el);
      return { property: s.transitionProperty, duration: s.transitionDuration };
    });
    expect(field.property, 'the ring is animated').toMatch(/box-shadow|all/);
    expect(seconds(field.duration), 'long enough to notice').toBeGreaterThanOrEqual(0.2);

    await page.keyboard.press('Shift');
    await button.focus();
    const ring = await button.evaluate((el) => getComputedStyle(el).animationName);
    expect(ring, 'buttons and links grow their ring in').toContain('focus-ring-in');
  });

  test('a label warms to the brand colour while its field has focus', async ({ page }) => {
    await page.goto('/login');
    const label = page.locator('label', { hasText: 'Email' });
    const before = await label.evaluate((el) => getComputedStyle(el).color);
    await page.getByLabel('Email').focus();
    await expect.poll(() => label.evaluate((el) => getComputedStyle(el).color), { message: 'label colour changes on focus' }).not.toBe(before);
  });
});
