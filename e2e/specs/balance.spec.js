import { test, expect } from '@playwright/test';
import { registerNewUser, addTransaction } from './helpers.js';

test.use({ reducedMotion: 'reduce' });

test.describe('A balance below zero', () => {
  test('says so, and the user can set what they really have', async ({ page }) => {
    await registerNewUser(page);
    await addTransaction(page, { amount: '5000', category: 'Groceries', description: 'Big shop' });

    const note = page.getByRole('region', { name: 'Balance' });
    await expect(note).toContainText('-₹5,000');
    await expect(note.getByText(/below zero/i)).toBeVisible();

    await note.getByRole('button', { name: 'Set my balance' }).click();
    const dialog = page.getByRole('dialog', { name: 'Update your balance' });
    await dialog.getByLabel(/in your accounts/i).fill('20000');
    await dialog.getByRole('button', { name: 'Save balance' }).click();
    await expect(dialog).toBeHidden();

    await expect(note).toContainText('₹20,000');
    await expect(note.getByText(/below zero/i)).toHaveCount(0);
    await expect(note.getByText(/includes the starting balance you set/i)).toBeVisible();

    // New spending still comes off the figure the user set.
    await addTransaction(page, { amount: '1000', category: 'Transport', description: 'Cab' });
    await expect(note).toContainText('₹19,000');
  });

  test('can be corrected with a negative figure for an overdrawn account', async ({ page }) => {
    await registerNewUser(page);
    await page.getByRole('button', { name: 'Update balance' }).click();
    const dialog = page.getByRole('dialog', { name: 'Update your balance' });
    await dialog.getByLabel(/in your accounts/i).fill('-1,250');
    await dialog.getByRole('button', { name: 'Save balance' }).click();
    await expect(page.getByRole('region', { name: 'Balance' })).toContainText('-₹1,250');
  });

  test('can be fetched from a demo bank, which says it is a demo', async ({ page }) => {
    await registerNewUser(page);
    await addTransaction(page, { amount: '5000', category: 'Groceries', description: 'Big shop' });
    await page.getByRole('button', { name: /fetch from bank/i }).click();
    const dialog = page.getByRole('dialog', { name: 'Update your balance' });
    await expect(dialog.getByText(/no real bank is connected/i)).toBeVisible();
    await dialog.getByRole('button', { name: 'Fetch balance' }).click();
    await expect(dialog.getByText(/sample data/i)).toBeVisible({ timeout: 8000 });
    const fetched = await dialog.getByTestId('fetched-balance').innerText();
    await dialog.getByRole('button', { name: 'Use this balance' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('region', { name: 'Balance' })).toContainText(fetched.replace(/\.00$/, '').slice(0, 6));
  });
});
