import { test, expect } from '@playwright/test';
import { registerNewUser, addTransaction } from './helpers.js';

// A small Android phone. Everything the user needs must fit without sideways scrolling.
test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

test.describe('Phone layout (360 px)', () => {
  test('a transaction row keeps its amount and actions inside the card', async ({ page }) => {
    await registerNewUser(page);
    await addTransaction(page, {
      amount: '1816',
      category: 'Groceries',
      description: 'Weekly groceries for the whole family',
      merchant: 'BigBasket',
    });
    await page.goto('/transactions');

    const card = page.locator('section', { has: page.getByRole('table') });
    const cardBox = await card.boundingBox();
    const row = page.getByRole('row', { name: /Weekly groceries/ });
    await expect(row).toBeVisible();

    for (const target of [
      row.getByText(/1,816\.00/),
      row.getByRole('button', { name: /^Edit / }),
      row.getByRole('button', { name: /^Delete / }),
    ]) {
      const box = await target.boundingBox();
      expect(box.x + box.width, 'right edge stays inside the card').toBeLessThanOrEqual(cardBox.x + cardBox.width + 0.5);
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'page does not scroll sideways').toBeLessThanOrEqual(0);
  });

  test('the floating Copilot button gives way to the tab bar on phones', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/transactions');
    await expect(page.locator('[data-copilot-launcher]')).toBeHidden();
    await expect(page.getByRole('navigation', { name: /main/i }).getByRole('link', { name: 'Copilot' })).toBeVisible();
  });
});

test.describe('Desktop layout', () => {
  test.use({ viewport: { width: 1366, height: 860 }, hasTouch: false });

  test('keeps the floating Copilot button', async ({ page }) => {
    await registerNewUser(page);
    await expect(page.locator('[data-copilot-launcher]')).toBeVisible();
  });
});
