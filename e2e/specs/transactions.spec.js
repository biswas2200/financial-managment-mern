import { test, expect } from '@playwright/test';
import { registerNewUser, addTransaction } from './helpers.js';

test.describe('Transactions end to end', () => {
  test('adding income and expenses updates the dashboard totals', async ({ page }) => {
    await registerNewUser(page);

    await addTransaction(page, { type: 'income', amount: '50000', category: 'Salary', description: 'November salary' });
    await addTransaction(page, { amount: '1250.50', category: 'Groceries', description: 'Weekly groceries', merchant: 'DMart' });
    await addTransaction(page, { amount: '349', category: 'Dining Out', description: 'Biryani', merchant: 'Swiggy' });

    await expect(page.getByTestId('kpi-income')).toContainText('₹50,000');
    await expect(page.getByTestId('kpi-expense')).toContainText('₹1,600'); // 1250.50 + 349 = 1599.50 → ₹1,600
    await expect(page.getByTestId('kpi-net')).toContainText('₹48,401'); // 48,400.50 rounds half up
    await expect(page.getByLabel('Balance')).toContainText('₹48,400.50');

    // Ranked categories and recent activity reflect the new data.
    await expect(page.getByText('Groceries').first()).toBeVisible();
    await expect(page.getByText('Biryani')).toBeVisible();
  });

  test('edit, filter, delete and undo on the transactions page', async ({ page }) => {
    await registerNewUser(page);
    await addTransaction(page, { amount: '450', category: 'Groceries', description: 'Vegetables', merchant: 'Blinkit' });
    await addTransaction(page, { amount: '220', category: 'Transport', description: 'Auto ride', merchant: 'Uber' });

    await page.getByRole('link', { name: 'Transactions' }).first().click();
    await expect(page.getByText('2 transactions')).toBeVisible();

    // Edit
    await page.getByRole('button', { name: 'Edit Vegetables' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Amount (₹)').fill('480');
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('row', { name: /Vegetables/ })).toContainText('₹480.00');

    // Search filter is reflected in the URL
    await page.getByLabel('Search transactions').fill('uber');
    await expect(page).toHaveURL(/q=uber/);
    await expect(page.getByText('1 transaction', { exact: false })).toBeVisible();
    await expect(page.getByRole('row', { name: /Vegetables/ })).toHaveCount(0);
    await page.getByRole('button', { name: /Clear 1 filter/ }).click();

    // Delete with undo
    await page.getByRole('button', { name: 'Delete Auto ride' }).click();
    await expect(page.getByRole('row', { name: /Auto ride/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('row', { name: /Auto ride/ })).toHaveCount(1);
  });

  test('form validation blocks bad input', async ({ page }) => {
    await registerNewUser(page);
    await page.getByRole('button', { name: 'Add transaction' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Amount (₹)').fill('12.345');
    await dialog.getByRole('button', { name: 'Save transaction' }).click();
    await expect(dialog.getByText('Enter a valid amount with at most 2 decimal places')).toBeVisible();
    await expect(dialog.getByText('Choose a category')).toBeVisible();
    await expect(dialog.getByText('Add a short description')).toBeVisible();
  });
});
