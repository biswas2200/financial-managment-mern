import { test, expect } from '@playwright/test';
import { toDayKey, currentMonthKey, shiftMonth, formatMonthLabel } from '@kosha/shared';
import { registerNewUser, addTransaction } from './helpers.js';

test.use({ reducedMotion: 'reduce' });

const NOW = currentMonthKey();
const PREVIOUS = shiftMonth(NOW, -1);

test.describe('Going back through the months', () => {
  test('click the month name, pick any earlier month from the grid', async ({ page }) => {
    await registerNewUser(page);
    const picker = page.getByRole('group', { name: 'Choose month' });
    await picker.getByRole('button', { name: formatMonthLabel(NOW) }).click();
    const grid = page.getByRole('dialog', { name: 'Pick a month' });
    if (PREVIOUS.slice(0, 4) !== NOW.slice(0, 4)) await grid.getByRole('button', { name: 'Previous year' }).click();
    await grid.getByRole('button', { name: formatMonthLabel(PREVIOUS) }).click();
    await expect(grid).toBeHidden();
    await expect(picker).toContainText(formatMonthLabel(PREVIOUS));
  });

  test('click a month on the Income and spending chart to jump to it', async ({ page }) => {
    await registerNewUser(page);
    const chart = page.getByRole('img', { name: 'Bar chart of monthly income and spending' });
    await chart.scrollIntoViewIfNeeded(); // mouse clicks use viewport coordinates
    await expect(chart).toBeVisible();
    const box = await chart.boundingBox();
    // Twelve slots to the right of the 58 px value axis; the last is this month, the one before it last month.
    const slot = (box.width - 58) / 12;
    await page.mouse.click(box.x + box.width - 1.5 * slot, box.y + box.height / 2);
    await expect(page.getByRole('group', { name: 'Choose month' })).toContainText(formatMonthLabel(PREVIOUS));
  });

  test('a month from before you joined shows the calendar but no insights', async ({ page }) => {
    await registerNewUser(page);
    await page.getByRole('button', { name: 'Previous month' }).click();

    await expect(page.getByText(/before you started using Kosha/i)).toBeVisible();
    await expect(page.getByRole('grid', { name: /Daily spending/ })).toBeVisible();
    await expect(page.getByRole('region', { name: 'This period at a glance' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Balance' })).toHaveCount(0);
    await expect(page.getByText('What stands out this month')).toHaveCount(0);

    // Back in the current month the insights return.
    await page.getByRole('button', { name: 'Next month' }).click();
    await expect(page.getByRole('region', { name: 'This period at a glance' })).toBeVisible();
  });

  test('backfilling an earlier month turns it into a normal month with its figures', async ({ page }) => {
    await registerNewUser(page);
    await page.getByRole('button', { name: 'Previous month' }).click();
    const day = `${PREVIOUS}-10`;
    await page.getByRole('gridcell', { name: new RegExp(`^${new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(`${day}T12:00:00+05:30`))}`) }).click();
    await page.getByRole('button', { name: /^Add expense for / }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Pick a date')).toHaveValue(day);
    await dialog.getByLabel('Amount (₹)').fill('640');
    await dialog.getByRole('radiogroup', { name: 'Category' }).getByText('Groceries', { exact: true }).click();
    await dialog.getByLabel('Description').fill('Old grocery run');
    await dialog.getByRole('button', { name: 'Save transaction' }).click();
    await expect(dialog).toBeHidden();

    await expect(page.getByText(/before you started using Kosha/i)).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'This period at a glance' })).toBeVisible();
  });
});

test.describe('Clicking a day', () => {
  test('shows what you spent that day and lets you add to it', async ({ page }) => {
    await registerNewUser(page);
    await addTransaction(page, { amount: '1816', category: 'Groceries', description: 'Weekly groceries', merchant: 'BigBasket' });

    const today = toDayKey(new Date());
    const todayCell = page.locator(`[role="gridcell"][data-date="${today}"]`);
    await todayCell.click();
    const panel = page.getByRole('region', { name: /Spending on/ });
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Weekly groceries')).toBeVisible();
    await expect(panel.getByText('−₹1,816.00', { exact: true })).toBeVisible();

    // Clicking it again puts the panel away.
    await todayCell.click();
    await expect(panel).toHaveCount(0);
  });

  test('a past day with nothing on it offers to add an expense, dated that day', async ({ page }) => {
    await registerNewUser(page);
    const past = toDayKey(new Date(Date.now() - 3 * 86400000));
    test.skip(past.slice(0, 7) !== currentMonthKey(), 'the first days of a month have no earlier day on this calendar');
    await page.locator(`[role="gridcell"][data-date="${past}"]`).click();
    const panel = page.getByRole('region', { name: /Spending on/ });
    await expect(panel.getByText(/Nothing recorded/i)).toBeVisible();
    await panel.getByRole('button', { name: /^Add expense for / }).click();
    await expect(page.getByRole('dialog').getByLabel('Pick a date')).toHaveValue(past);
    await page.getByRole('dialog').getByLabel('Amount (₹)').fill('120');
    await page.getByRole('dialog').getByRole('radiogroup', { name: 'Category' }).getByText('Transport', { exact: true }).click();
    await page.getByRole('dialog').getByLabel('Description').fill('Metro top-up');
    await page.getByRole('dialog').getByRole('button', { name: 'Save transaction' }).click();
    await expect(panel.getByText('Metro top-up')).toBeVisible();
  });
});
