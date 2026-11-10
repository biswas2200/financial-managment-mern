import { test, expect } from '@playwright/test';
import { registerNewUser, addTransaction } from './helpers.js';

test.describe('Copilot and budgets', () => {
  test('Copilot drafts a transaction that is saved only after Confirm', async ({ page }) => {
    await registerNewUser(page);
    await page.getByRole('link', { name: 'Copilot' }).first().click();

    await page.getByLabel('Message Copilot').fill('Spent 300 on Uber yesterday');
    await page.keyboard.press('Enter');

    const confirm = page.getByRole('button', { name: 'Confirm' });
    await expect(confirm).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('₹300.00').first()).toBeVisible();

    // Not saved yet
    const before = await page.request.get('/api/v1/transactions');
    expect((await before.json()).total).toBe(0);

    await confirm.click();
    await expect(page.getByText('Saved to your transactions')).toBeVisible();

    await page.getByRole('link', { name: 'Transactions' }).first().click();
    await expect(page.getByRole('row', { name: /Uber/ })).toContainText('added by Copilot');
  });

  test('Copilot answers spending questions from real data', async ({ page }) => {
    await registerNewUser(page);
    await addTransaction(page, { amount: '1500', category: 'Shopping', description: 'Shoes', merchant: 'Myntra' });
    await page.getByRole('link', { name: 'Copilot' }).first().click();

    await page.getByLabel('Message Copilot').fill('How much did I spend this month?');
    await page.keyboard.press('Enter');
    await expect(page.getByText(/spent \*?\*?₹1,500/).or(page.getByText(/₹1,500\.00/)).first()).toBeVisible({ timeout: 30_000 });
  });

  test('a budget warns when spending gets close to the limit', async ({ page }) => {
    await registerNewUser(page);
    await page.getByRole('link', { name: 'Budgets' }).first().click();

    await page.getByRole('button', { name: 'Add budget' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Category').selectOption({ label: 'Groceries' });
    await dialog.getByLabel('Monthly limit (₹)').fill('1000');
    await dialog.getByRole('button', { name: 'Save budget' }).click();
    await expect(dialog).toBeHidden();

    await addTransaction(page, { amount: '800', category: 'Groceries', description: 'Monthly stock-up' });
    await expect(page.getByText('Close to limit').first()).toBeVisible();
    await expect(page.getByText('(80%)')).toBeVisible();
  });
});
