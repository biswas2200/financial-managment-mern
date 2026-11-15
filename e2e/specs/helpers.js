import { expect } from '@playwright/test';

export const PASSWORD = 'e2eTest1234';

/** Registers a brand-new user through the UI and lands on the dashboard. */
export async function registerNewUser(page, name = 'Neha Kulkarni') {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@kosha.test`;
  await page.goto('/register');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name.split(' ')[0]);
  return { email, password: PASSWORD, name };
}

/** Adds a transaction through the "Add expense" / "Add income" buttons. */
export async function addTransaction(page, { type = 'expense', amount, category, description, merchant }) {
  await page.getByRole('button', { name: type === 'income' ? 'Add income' : 'Add expense' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Amount (₹)').fill(String(amount));
  await dialog.getByRole('radiogroup', { name: 'Category' }).getByText(category, { exact: true }).click();
  if (merchant) await dialog.getByLabel('Merchant or payee').fill(merchant);
  if (description) await dialog.getByLabel('Description').fill(description);
  await dialog.getByRole('button', { name: 'Save transaction' }).click();
  await expect(dialog).toBeHidden();
}
