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
      // The report shows the plain sign-in form; the demo-account helper stays in the app.
      await page.addStyleTag({ content: '[data-demo-hint]{display:none!important}' });
      await page.waitForTimeout(200);
      await shot(page, 'login');
      await ctx.close();
    }

    const APP_SHOTS = ['dashboard', 'transactions', 'add-transaction', 'analytics', 'budgets', 'copilot', 'settings', 'dark'];
    const needsApp = APP_SHOTS.some(want);
    const ctx = needsApp ? await signedInContext(browser, { colorScheme: 'light' }) : null;
    const page = needsApp ? await ctx.newPage() : null;
    if (page) await page.addInitScript(() => localStorage.setItem('kosha-theme', 'light'));

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
      await page.getByRole('button', { name: 'Add expense' }).first().click();
      const dlg = page.getByRole('dialog');
      await dlg.getByLabel('Amount (₹)').fill('450');
      await dlg.getByRole('radiogroup', { name: 'Category' }).getByText('Groceries', { exact: true }).click();
      await dlg.getByLabel('Merchant or payee').fill('Blinkit');
      await page.waitForTimeout(300);
      await shot(page, 'add-transaction');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      // Validation state on a fresh form
      await page.getByRole('button', { name: 'Add expense' }).first().click();
      await dlg.getByLabel('Amount (₹)').fill('12.345');
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
    await ctx?.close();


    const NEW_SHOTS = ['balance', 'budget-add', 'months', 'day-detail', 'register', 'privacy'];
    if (NEW_SHOTS.some(want)) {
      const ym = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' }).slice(0, 7);
      const nctx = await signedInContext(browser, { colorScheme: 'light' });
      const n = await nctx.newPage();
      await n.addInitScript(() => localStorage.setItem('kosha-theme', 'light'));

      if (want('balance')) {
        // A balance below zero is explained and fixable. Nothing is saved: the dialog is closed each time.
        await n.goto(`${BASE}/`);
        await settle(n, 2600);
        await n.addStyleTag({ content: '[data-copilot-launcher]{display:none!important}' });
        await shot(n, 'balance-negative');
        await n.getByRole('button', { name: 'Set my balance' }).click();
        await n.getByLabel(/in your accounts/i).fill('-2,500');
        await n.waitForTimeout(500);
        await shot(n, 'balance-dialog');
        await n.getByRole('dialog').getByText('Fetch from bank (demo)').click();
        await n.getByRole('button', { name: 'Fetch balance' }).click();
        await n.getByText(/sample data/i).waitFor({ timeout: 8000 });
        await n.waitForTimeout(500);
        await shot(n, 'balance-bank');
        await n.keyboard.press('Escape');
        await n.waitForTimeout(300);
      }

      if (want('budget-add')) {
        await n.goto(`${BASE}/budgets`);
        await settle(n, 1200);
        await n.getByRole('button', { name: 'Add budget' }).first().click();
        const dlg = n.getByRole('dialog', { name: 'Add a budget' });
        await dlg.getByRole('combobox', { name: 'Category' }).click();
        await n.waitForTimeout(500);
        await shot(n, 'budget-dropdown');
        await n.getByRole('option', { name: 'New category…' }).click();
        await n.getByRole('dialog', { name: 'New category' }).getByLabel('Name').fill('Pets');
        await n.getByRole('button', { name: 'Icon paw-print' }).click();
        await n.waitForTimeout(400);
        await shot(n, 'budget-new-category');
        await n.keyboard.press('Escape');
        await n.keyboard.press('Escape');
      }

      if (want('months')) {
        await n.goto(`${BASE}/`);
        await settle(n, 1800);
        await n.getByRole('group', { name: 'Choose month' }).getByRole('button', { name: /\d{4}$/ }).click();
        await n.waitForTimeout(500);
        await shot(n, 'month-picker');
        await n.keyboard.press('Escape');
        // A month from before the account: the calendar stays, the insights go.
        await n.getByRole('group', { name: 'Choose month' }).getByRole('button', { name: /\d{4}$/ }).click();
        const year = Number(ym.slice(0, 4)) - 1;
        await n.getByRole('dialog', { name: 'Pick a month' }).getByRole('button', { name: 'Previous year' }).click();
        await n.getByRole('button', { name: `October ${year}` }).click();
        await settle(n, 900);
        await shot(n, 'before-account', { fullPage: false });
      }

      if (want('day-detail')) {
        await n.goto(`${BASE}/`);
        await settle(n, 2200);
        await n.addStyleTag({ content: '[data-copilot-launcher]{display:none!important}' });
        const cell = n.locator(`[role="gridcell"][data-date="${ym}-05"]`);
        await cell.scrollIntoViewIfNeeded();
        await cell.click();
        await n.waitForTimeout(900);
        const panel = n.getByRole('region', { name: /Spending on/ });
        await panel.scrollIntoViewIfNeeded();
        await shot(n, 'day-detail');
      }
      await nctx.close();

      if (want('register')) {
        const rctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata', colorScheme: 'light' });
        const r = await rctx.newPage();
        await r.addInitScript(() => localStorage.setItem('kosha-theme', 'light'));
        await r.goto(`${BASE}/register`);
        await settle(r, 1500);
        await r.getByLabel('Name').fill('Priya Nair');
        await r.getByLabel('Email').fill('priya@example.com');
        await r.getByLabel('Password', { exact: true }).fill('firstRun2026');
        await r.getByLabel(/phone number/i).fill('98765 43210');
        await r.getByLabel('Date of birth, day').click();
        await r.keyboard.type('14081999');
        await r.getByRole('checkbox', { name: /I agree/ }).check();
        await r.waitForTimeout(500);
        await shot(r, 'register');
        await r.goto(`${BASE}/privacy`);
        await settle(r, 800);
        await shot(r, 'privacy');
        await rctx.close();
      } else if (want('privacy')) {
        const pctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-IN', colorScheme: 'light' });
        const pp = await pctx.newPage();
        await pp.goto(`${BASE}/privacy`);
        await settle(pp, 800);
        await shot(pp, 'privacy');
        await pctx.close();
      }
    }

    if (want('onboarding')) {
      const octx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata', colorScheme: 'light' });
      const email = `newuser-${Date.now()}@kosha.test`;
      const res = await octx.request.post(`${BASE}/api/v1/auth/register`, { data: { name: 'Priya Nair', email, password: 'firstRun2026', acceptedTerms: true } });
      if (!res.ok()) throw new Error(`Could not create the onboarding account (${res.status()})`);
      const o = await octx.newPage();
      await o.addInitScript(() => localStorage.setItem('kosha-theme', 'light'));
      await o.goto(`${BASE}/`);
      await settle(o, 2200);
      await shot(o, 'onboarding');
      await octx.close();
    }

    if (want('database')) {
      const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const d = await dctx.newPage();
      await d.goto(process.env.MONGO_EXPRESS_URL ?? 'http://localhost:8081/db/kosha/');
      await settle(d, 800);
      await shot(d, 'database');
      await d.goto(`${process.env.MONGO_EXPRESS_URL ?? 'http://localhost:8081/db/kosha/'}transactions`);
      await settle(d, 800);
      await shot(d, 'database-transactions');
      await dctx.close();
    }

    if (want('github')) {
      const gctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-IN', colorScheme: 'light' });
      const g = await gctx.newPage();
      const repo = 'https://github.com/biswas2200/financial-managment-mern';
      await g.goto(repo, { waitUntil: 'domcontentloaded' });
      await settle(g, 2500);
      await shot(g, 'github-repo');
      await g.goto(`${repo}/commits/main`, { waitUntil: 'domcontentloaded' });
      await settle(g, 2500);
      await shot(g, 'github-commits');
      await gctx.close();
    }

    // ---- Landing, Learn, Discussions, Markets (shown for the demo account; nothing is changed) ----
    const NEW_AREAS = ['landing', 'learn', 'discussions', 'markets', 'settings-pages', 'mobile-more'];
    if (NEW_AREAS.some(want)) {
      if (want('landing')) {
        const lctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', locale: 'en-IN', reducedMotion: 'reduce' });
        const l = await lctx.newPage();
        await l.addInitScript(() => localStorage.setItem('kosha-theme', 'light'));
        await l.goto(`${BASE}/`);
        await settle(l, 1500);
        await shot(l, 'landing');
        await shot(l, 'landing-full', { fullPage: true });
        await l.goto(`${BASE}/login`);
        await settle(l, 1500);
        await l.addStyleTag({ content: '[data-demo-hint]{display:none!important}' });
        await shot(l, 'login');
        await lctx.close();
        const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', locale: 'en-IN', reducedMotion: 'reduce' });
        const d = await dctx.newPage();
        await d.goto(`${BASE}/`);
        await settle(d, 1500);
        await shot(d, 'landing-dark');
        await dctx.close();
      }

      const actx = await signedInContext(browser, { colorScheme: 'light', reducedMotion: 'reduce' });
      const a = await actx.newPage();
      await a.addInitScript(() => localStorage.setItem('kosha-theme', 'light'));
      const hideLauncher = () => a.addStyleTag({ content: '[data-copilot-launcher]{display:none!important}' });

      if (want('learn')) {
        await a.goto(`${BASE}/learn`);
        await settle(a, 1200);
        await hideLauncher();
        await shot(a, 'learn');
        await a.goto(`${BASE}/learn/compounding-and-sip`);
        await settle(a, 1200);
        await shot(a, 'article');
      }

      if (want('discussions')) {
        // A throwaway member writes a few realistic posts, is photographed, then deletes the account (and with it, the posts).
        const sctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', locale: 'en-IN', reducedMotion: 'reduce' });
        const password = 'showcase2026';
        const email = `showcase-${Date.now()}@kosha.test`;
        const reg = await sctx.request.post(`${BASE}/api/v1/auth/register`, { data: { name: 'Priya Nair', email, password, acceptedTerms: true } });
        if (!reg.ok()) throw new Error(`Could not create the showcase member (${reg.status()})`);
        const make = async (space, title, body) => (await (await sctx.request.post(`${BASE}/api/v1/community/posts`, { data: { space, title, body } })).json()).id;
        const first = await make('stocks', 'How do I read a P/E ratio?', 'I keep seeing P/E on every stock page. What is a sensible way to read it, and should I compare it with other companies?');
        await make('funds', 'SIP or lump sum for a ten-year goal?', 'I can save 10,000 a month and I also have a bonus coming. Which approach do people usually prefer, and why?');
        await make('safety', 'A caller said they sent me money by mistake', 'They asked me to send it back from my UPI app. It felt off, so I did not. Has anyone seen this one?');
        await make('saving', 'How big an emergency fund with a home-loan EMI?', 'My essentials come to about 45,000 a month including the EMI. Is six months enough, or should I keep more?');
        await sctx.request.post(`${BASE}/api/v1/community/comments`, { data: { kind: 'post', target: first, body: 'Compare it with companies in the same industry and with its own history, and remember a low P/E is not automatically cheap.' } });
        await sctx.request.put(`${BASE}/api/v1/community/reactions`, { data: { kind: 'post', target: first, value: 'like' } });
        const dp = await sctx.newPage();
        await dp.addInitScript(() => localStorage.setItem('kosha-theme', 'light'));
        await dp.goto(`${BASE}/discussions`);
        await settle(dp, 1500);
        await dp.addStyleTag({ content: '[data-copilot-launcher]{display:none!important}' });
        await shot(dp, 'discussions');
        await dp.goto(`${BASE}/discussions/${first}`);
        await settle(dp, 1500);
        await shot(dp, 'post');
        await sctx.request.delete(`${BASE}/api/v1/auth/me`, { data: { password } });
        await sctx.close();
      }

      if (want('markets')) {
        await a.goto(`${BASE}/markets`);
        await settle(a, 1800);
        await hideLauncher();
        await shot(a, 'markets');
        await a.goto(`${BASE}/markets/stocks/RELIANCE`);
        await settle(a, 1800);
        await shot(a, 'stock');
        await a.goto(`${BASE}/markets/funds`);
        await settle(a, 2500);
        await shot(a, 'funds');
        await a.goto(`${BASE}/markets/funds/120716`);
        await settle(a, 2500);
        await shot(a, 'fund');
      }

      if (want('settings-pages')) {
        await a.goto(`${BASE}/settings/categories`);
        await settle(a, 1000);
        await hideLauncher();
        await shot(a, 'settings-categories');
      }
      await actx.close();

      if (want('mobile-more')) {
        const mctx = await signedInContext(browser, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'light', reducedMotion: 'reduce' });
        const m = await mctx.newPage();
        await m.addInitScript(() => localStorage.setItem('kosha-theme', 'light'));
        await m.goto(`${BASE}/markets`);
        await settle(m, 2000);
        await shot(m, 'mobile-markets');
        await m.getByRole('button', { name: 'More' }).click();
        await m.waitForTimeout(500);
        await shot(m, 'mobile-more');
        await m.keyboard.press('Escape');
        await m.goto(`${BASE}/learn/emergency-fund`);
        await settle(m, 1500);
        await shot(m, 'mobile-article');
        await mctx.close();
      }
    }

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
      await m.getByRole('button', { name: 'Account menu' }).click();
      await m.waitForTimeout(300);
      await shot(m, 'mobile-menu');
      await m.keyboard.press('Escape');
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
