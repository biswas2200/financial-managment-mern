import { expect } from '@playwright/test';

export const PASSWORD = 'e2eTest1234';

/** Registers a brand-new user through the UI and lands on the dashboard. */
export async function registerNewUser(page, name = 'Neha Kulkarni') {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@kosha.test`;
  await page.goto('/register');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name.split(' ')[0]);
  return { email, password: PASSWORD, name };
}

/** Adds a transaction through the global "Add transaction" dialog. */
export async function addTransaction(page, { type = 'expense', amount, category, description, merchant }) {
  await page.getByRole('button', { name: 'Add transaction' }).first().click();
  const dialog = page.getByRole('dialog');
  if (type === 'income') await dialog.getByText('Income', { exact: true }).click();
  await dialog.getByLabel('Amount (₹)').fill(String(amount));
  await dialog.getByLabel('Category').selectOption({ label: category });
  await dialog.getByLabel('Description').fill(description);
  if (merchant) await dialog.getByLabel('Merchant or payee').fill(merchant);
  await dialog.getByRole('button', { name: 'Save transaction' }).click();
  await expect(dialog).toBeHidden();
}
