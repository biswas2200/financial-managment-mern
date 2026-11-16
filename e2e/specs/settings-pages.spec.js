import { test, expect } from '@playwright/test';
import { registerNewUser } from './helpers.js';

test.use({ reducedMotion: 'reduce' });

test.describe('Settings pages', () => {
  test('categories live on their own page, reachable from the settings tabs', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
    await expect(page.getByText('Expense categories')).toBeHidden();

    await page.getByRole('navigation', { name: 'Settings sections' }).getByRole('link', { name: 'Categories' }).click();
    await expect(page).toHaveURL(/\/settings\/categories$/);
    await expect(page.getByText('Expense categories')).toBeVisible();
    await expect(page.getByText('Income categories')).toBeVisible();
    await expect(page.getByText('Groceries', { exact: true })).toBeVisible();
  });

  test('a category made on the categories page is saved by the server and survives a reload', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/settings/categories');
    await page.getByRole('button', { name: 'New category' }).click();
    const dialog = page.getByRole('dialog', { name: 'New category' });
    await dialog.getByLabel('Name').fill('Pet care');
    await dialog.getByRole('button', { name: 'Add category' }).click();
    await expect(page.getByText('Pet care', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('Pet care', { exact: true })).toBeVisible();
  });

  test('theme is chosen on the preferences page and kept after a reload', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/settings/preferences');
    await page.getByRole('radiogroup', { name: 'Theme' }).getByText('Dark').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('the privacy page shows the consent that was recorded at sign-up', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/settings/privacy');
    await expect(page.getByText(/you accepted version/i)).toBeVisible();
  });
});
