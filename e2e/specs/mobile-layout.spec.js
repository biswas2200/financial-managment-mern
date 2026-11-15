import { test, expect } from '@playwright/test';
import { registerNewUser, addTransaction } from './helpers.js';

// A small Android phone. Everything the user needs must fit without sideways scrolling.
// Reduced motion keeps the entrance animations (which scale panels) from skewing the measurements.
test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, reducedMotion: 'reduce' });

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

  test('two transactions show above the tab bar without scrolling', async ({ page }) => {
    await registerNewUser(page);
    await addTransaction(page, { amount: '250', category: 'Transport', description: 'Auto ride', merchant: 'Uber' });
    await addTransaction(page, { amount: '90', category: 'Dining Out', description: 'Filter coffee', merchant: 'Third Wave' });
    await page.goto('/transactions');
    const second = page.getByRole('row', { name: /Auto ride/ }); // the older of the two sorts last
    const tabBar = await page.getByRole('navigation', { name: 'Main' }).boundingBox();
    await expect
      .poll(async () => (await second.boundingBox()).y + (await second.boundingBox()).height, { message: 'filters and sorting leave room for the list' })
      .toBeLessThanOrEqual(tabBar.y);
  });

  test('the month picker spans the full width so its arrows sit at the edges', async ({ page }) => {
    await registerNewUser(page);
    const picker = page.getByRole('group', { name: 'Choose month' });
    const main = await page.locator('#main').boundingBox();
    // Poll: panels scale in on load, so the width is only final once that settles.
    await expect
      .poll(async () => (await picker.boundingBox()).width, { message: 'as wide as the content column (the page minus its 16 px gutters)' })
      .toBeGreaterThanOrEqual(main.width - 32 - 2);
    const box = await picker.boundingBox();
    const next = await picker.getByRole('button', { name: 'Next month' }).boundingBox();
    expect(next.x + next.width, 'next arrow hugs the right edge').toBeGreaterThanOrEqual(box.x + box.width - 8);
  });

  test('the Copilot message box sits above the tab bar without scrolling', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/copilot');
    const composer = page.locator('form', { has: page.getByLabel('Message Copilot') });
    await expect(composer).toBeVisible();
    const tabBar = await page.getByRole('navigation', { name: 'Main' }).boundingBox();
    // Poll: the page header briefly wraps to an extra line while the web font swaps in.
    await expect
      .poll(async () => (await composer.boundingBox()).y + (await composer.boundingBox()).height, { message: 'bottom of the composer is clear of the tab bar' })
      .toBeLessThanOrEqual(tabBar.y);
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
