import { test, expect } from '@playwright/test';
import { registerNewUser } from './helpers.js';

// The chevron colour is the theme's muted ink (--ink-3) so it reads on the field but stays quiet.
const MUTED_INK = { light: '#646c87', dark: '#848ca8' };

for (const scheme of ['light', 'dark']) {
  test.describe(`Dropdowns (${scheme} theme)`, () => {
    test.use({ colorScheme: scheme, reducedMotion: 'reduce' });

    test("use Kosha's own chevron instead of the browser's", async ({ page }) => {
      await registerNewUser(page);
      await page.goto('/transactions');
      const when = page.getByLabel('When');
      await expect(when).toBeVisible();

      const style = await when.evaluate((el) => {
        const s = getComputedStyle(el);
        return { appearance: s.appearance, image: s.backgroundImage };
      });
      expect(style.appearance, 'the native arrow is switched off').toBe('none');
      expect(style.image, 'a drawn chevron replaces it').toMatch(/^url\(/);
      expect(decodeURIComponent(style.image), 'the chevron follows the theme').toContain(MUTED_INK[scheme]);
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
