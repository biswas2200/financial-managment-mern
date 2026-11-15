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
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Neha');
  });

  test('rejects a wrong password with a clear message', async ({ page }) => {
    const user = await registerNewUser(page);
    await page.getByRole('button', { name: 'Sign out' }).click();

    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill('wrong-password1');
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
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Enter a valid email address')).toBeVisible();
    await expect(page.getByText('Use at least 8 characters')).toBeVisible();
  });

  test('sign-up needs the Terms and the Privacy Policy to be accepted', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Name').fill('Neha Kulkarni');
    await page.getByLabel('Email').fill(`consent-${Date.now()}@kosha.test`);
    await page.getByLabel('Password', { exact: true }).fill('e2eTest1234');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText(/please accept the terms/i)).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);

    await page.getByRole('checkbox', { name: /I agree/ }).check();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Neha');
  });

  test('the Privacy Policy and Terms can be read without an account', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();
    await page.getByRole('link', { name: 'Terms of Use' }).click();
    await expect(page).toHaveURL(/\/terms$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Terms of Use' })).toBeVisible();
  });

  test('a date of birth typed on sign-up moves between the boxes and shows the age', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Date of birth, day').click();
    await page.keyboard.type('09042001');
    await expect(page.getByLabel('Date of birth, year')).toHaveValue('2001');
    await expect(page.getByText(/You're \d+/)).toBeVisible();
  });
});
