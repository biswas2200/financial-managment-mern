/**
 * Captures screenshots of every Kosha screen for the project report.
 *
 *   npm run dev                 # in another terminal (API :5000, web :5173)
 *   npm run screenshots         # writes docs/report/screenshots/*.png
 *   npm run screenshots -- dashboard copilot   # only some shots
 *
 * Uses the system Google Chrome through Playwright, so no browser download is needed.
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'docs/report/screenshots');
const BASE = process.env.KOSHA_URL ?? 'http://localhost:5173';
// Seed-dataset demo account (local development only)
const DEMO = { email: 'demo@kosha.app', password: 'Demo@1234' };
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const want = (name) => !only.length || only.includes(name);

async function settle(page, ms = 1800) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(ms); // let the guilloché animation and charts finish
}

async function shot(page, name, { fullPage = false } = {}) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage });
  console.log(`  ✓ ${path.relative(ROOT, file)}`);
}

async function signedInContext(browser, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'en-IN', timezoneId: 'Asia/Kolkata', ...options });
  const res = await context.request.post(`${BASE}/api/v1/auth/login`, { data: DEMO });
  if (!res.ok()) throw new Error(`Demo login failed (${res.status()}). Is the API running and seeded?`);
  return context;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  console.log(`Capturing ${BASE} → ${path.relative(ROOT, OUT)}`);

  try {
    if (want('login')) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', locale: 'en-IN', timezoneId: 'Asia/Kolkata' });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/login`);
      await settle(page, 2600);
      await shot(page, 'login');
      await ctx.close();
    }

    const ctx = await signedInContext(browser, { colorScheme: 'light' });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('kosha-theme', 'light'));

    if (want('dashboard')) {
      await page.goto(`${BASE}/`);
      await settle(page, 2600);
      await shot(page, 'dashboard');
      // The floating Copilot button would sit over the charts in a full-page capture.
      await page.addStyleTag({ content: '[data-copilot-launcher]{display:none!important}' });
      await shot(page, 'dashboard-full', { fullPage: true });
    }

    if (want('transactions')) {
      await page.goto(`${BASE}/transactions`);
      await settle(page);
      await shot(page, 'transactions');
      await page.goto(`${BASE}/transactions?type=expense&q=swiggy`);
      await settle(page);
      await shot(page, 'transactions-filtered');
    }

    if (want('add-transaction')) {
      await page.goto(`${BASE}/transactions`);
      await settle(page, 800);
      await page.getByRole('button', { name: 'Add transaction' }).first().click();
      const dlg = page.getByRole('dialog');
      await dlg.getByLabel('Amount (₹)').fill('450');
      await dlg.getByLabel('Category').selectOption({ label: 'Groceries' });
      await dlg.getByLabel('Description').fill('Weekly vegetables');
      await dlg.getByLabel('Merchant or payee').fill('Blinkit');
      await page.waitForTimeout(300);
      await shot(page, 'add-transaction');
      // Validation state
      await dlg.getByLabel('Amount (₹)').fill('12.345');
      await dlg.getByLabel('Description').fill('');
      await dlg.getByRole('button', { name: 'Save transaction' }).click();
      await page.waitForTimeout(400);
      await shot(page, 'form-validation');
      await page.keyboard.press('Escape');
    }

    if (want('analytics')) {
      await page.goto(`${BASE}/analytics`);
      await settle(page);
      await shot(page, 'analytics');
      await page.addStyleTag({ content: '[data-copilot-launcher]{display:none!important}' });
      await shot(page, 'analytics-full', { fullPage: true });
    }

    if (want('budgets')) {
      await page.goto(`${BASE}/budgets`);
      await settle(page);
      await shot(page, 'budgets');
    }

    if (want('copilot')) {
      await page.goto(`${BASE}/copilot`);
      await settle(page, 800);
      const clear = page.getByRole('button', { name: 'Clear chat' });
      if (await clear.isVisible().catch(() => false)) {
        await clear.click();
        await page.waitForTimeout(500);
      }
      await shot(page, 'copilot-empty');
      for (const q of ['How much did I spend this month?', 'Where is my money going?', 'Spent 450 on groceries yesterday']) {
        await page.getByLabel('Message Copilot').fill(q);
        await page.keyboard.press('Enter');
        await page.waitForResponse((r) => r.url().includes('/assistant/message'), { timeout: 60000 });
        await page.waitForTimeout(900);
      }
      await settle(page, 600);
      await shot(page, 'copilot');
    }

    if (want('settings')) {
      await page.goto(`${BASE}/settings`);
      await settle(page);
      await shot(page, 'settings');
    }

    if (want('dark')) {
      await page.addInitScript(() => localStorage.setItem('kosha-theme', 'dark'));
      await page.goto(`${BASE}/`);
      await settle(page, 2600);
      await shot(page, 'dashboard-dark');
      await page.goto(`${BASE}/analytics`);
      await settle(page);
      await shot(page, 'analytics-dark');
    }
    await ctx.close();

    if (want('mobile')) {
      const mctx = await signedInContext(browser, {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        colorScheme: 'light',
      });
      const m = await mctx.newPage();
      await m.addInitScript(() => localStorage.setItem('kosha-theme', 'light'));
      await m.goto(`${BASE}/`);
      await settle(m, 2600);
      await shot(m, 'mobile-dashboard');
      await m.goto(`${BASE}/transactions`);
      await settle(m);
      await shot(m, 'mobile-transactions');
      await mctx.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
