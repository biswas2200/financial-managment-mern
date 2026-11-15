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
