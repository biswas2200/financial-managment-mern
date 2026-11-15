import { test, expect } from '@playwright/test';
import { registerNewUser } from './helpers.js';

test.describe('Budgets with your own categories', () => {
  test('make a category with its own icon while adding a budget, then use it for spending', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/budgets');
    await page.getByRole('button', { name: 'Add a budget' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add a budget' });

    await dialog.getByRole('combobox', { name: 'Category' }).click();
    await page.getByRole('option', { name: 'New category…' }).click();
    const fresh = page.getByRole('dialog', { name: 'New category' });
    await fresh.getByLabel('Name').fill('Pets');
    await fresh.getByRole('button', { name: 'Icon paw-print' }).click();
    await fresh.getByRole('button', { name: 'Add category' }).click();

    // Only the small dialog closes; the budget form stays open with the new category chosen.
    await expect(fresh).toBeHidden();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('combobox', { name: 'Category' })).toContainText('Pets');

    await dialog.getByLabel(/Monthly limit/).fill('3000');
    await dialog.getByRole('button', { name: 'Save budget' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Edit Pets budget' })).toBeVisible();

    // The new category is available everywhere else too.
    await page.getByRole('button', { name: 'Add expense' }).first().click();
    await expect(page.getByRole('dialog').getByRole('radiogroup', { name: 'Category' }).getByText('Pets', { exact: true })).toBeVisible();
  });

  test('every expense category can be picked, and the ones that already have a budget say so', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/budgets');
    await page.getByRole('button', { name: 'Add a budget' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add a budget' });
    await dialog.getByRole('combobox', { name: 'Category' }).click();
    await page.getByRole('option', { name: /Groceries/ }).click();
    await dialog.getByLabel(/Monthly limit/).fill('5000');
    await dialog.getByRole('button', { name: 'Save budget' }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole('button', { name: 'Add budget' }).first().click();
    await page.getByRole('dialog', { name: 'Add a budget' }).getByRole('combobox', { name: 'Category' }).click();
    const list = page.getByRole('listbox');
    await expect(list.getByRole('option', { name: /Groceries/ })).toContainText('Budget set');
    await expect(list.getByRole('option', { name: /Travel/ })).toBeVisible();
  });
});
