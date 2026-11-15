import { test, expect } from '@playwright/test';
import { registerNewUser, PASSWORD } from './helpers.js';

test.use({ reducedMotion: 'reduce' });

// A 1x1 red PNG: small enough to type out, real enough for the browser to decode.
const RED_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test.describe('Profile', () => {
  test('phone, date of birth and an icon picture are saved and still there after a reload', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/settings');
    await page.getByLabel(/phone number/i).fill('98765 43210');
    await page.getByLabel('Date of birth, day').click();
    await page.keyboard.type('09042001');
    await page.getByRole('button', { name: 'Use the rocket icon' }).click();
    await page.getByRole('button', { name: 'Background #eb6834' }).click();
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByText('Profile updated')).toBeVisible();

    await page.reload();
    await expect(page.getByLabel(/phone number/i)).toHaveValue('+919876543210');
    await expect(page.getByLabel('Date of birth, year')).toHaveValue('2001');
    await expect(page.locator('aside [data-avatar="rocket"]')).toBeVisible();
  });

  test('your own photo becomes the picture in the sidebar', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/settings');
    await page.getByLabel('Upload a photo').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: RED_PNG });
    await expect(page.locator('main [data-avatar="photo"]')).toBeVisible();
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByText('Profile updated')).toBeVisible();
    const src = await page.locator('aside img[data-avatar="photo"]').getAttribute('src');
    expect(src).toMatch(/^data:image\/jpeg;base64,/);
    expect(src.length, 'shrunk to a small image').toBeLessThan(90_000);
  });

  test('a half-typed date of birth is rejected with a reason', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/settings');
    await page.getByLabel('Date of birth, day').click();
    await page.keyboard.type('31');
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByText(/valid date of birth/i)).toBeVisible();
  });

  test('deleting the account needs the password and ends the session for good', async ({ page }) => {
    const user = await registerNewUser(page);
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Delete my account' }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete your account?' });

    await dialog.getByLabel('Your password').fill('not-my-password1');
    await dialog.getByRole('button', { name: 'Delete everything' }).click();
    await expect(dialog.getByRole('alert')).toContainText(/incorrect/i);

    await dialog.getByLabel('Your password').fill(PASSWORD);
    await dialog.getByRole('button', { name: 'Delete everything' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
  });
});
