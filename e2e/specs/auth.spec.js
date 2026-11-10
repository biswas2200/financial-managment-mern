import { test, expect } from '@playwright/test';
import { registerNewUser } from './helpers.js';

test.describe('Authentication', () => {
  test('register, sign out, and sign back in', async ({ page }) => {
    const user = await registerNewUser(page);

    // A new account starts empty but already has categories.
    await expect(page.getByText('Nothing logged yet')).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Neha');
  });

  test('rejects a wrong password with a clear message', async ({ page }) => {
    const user = await registerNewUser(page);
    await page.getByRole('button', { name: 'Sign out' }).click();

    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill('wrong-password1');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
  });

  test('protects app pages from signed-out visitors', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('validates the sign-up form before calling the API', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('short');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Enter a valid email address')).toBeVisible();
    await expect(page.getByText('Use at least 8 characters')).toBeVisible();
  });
});
