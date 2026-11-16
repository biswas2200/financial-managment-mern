import { test, expect } from '@playwright/test';
import { registerNewUser } from './helpers.js';

test.use({ reducedMotion: 'reduce' });

/** These tests use the real NSE and AMFI sources through the real server. If they cannot be reached from where the
 *  tests run, the tests that need numbers are skipped (the honest-failure tests below still run). */
let reachable;
test.beforeAll(async ({ request }) => {
  // The market routes need a session, so ask through a throwaway signup.
  const email = `probe-${Date.now()}@kosha.test`;
  const base = process.env.KOSHA_URL ?? 'http://localhost:5173';
  const signup = await request.post(`${base}/api/v1/auth/register`, { data: { name: 'Probe User', email, password: 'probePass1', acceptedTerms: true } });
  const res = await request.get(`${base}/api/v1/markets/overview`);
  reachable = signup.ok() && res.ok();
});

test.describe('Markets with real end-of-day data', () => {
  test.beforeEach(() => test.skip(!reachable, 'The NSE or AMFI data sources are not reachable from here'));

  test('the overview shows indices, breadth and movers, dated and labelled end-of-day', async ({ page }) => {
    await registerNewUser(page);
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Markets', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Markets' })).toBeVisible();
    await expect(page.getByText(/End-of-day data from NSE India as of \d{1,2} \w{3} 20\d\d/)).toBeVisible();
    await expect(page.getByRole('link', { name: /^Nifty 50/ })).toContainText(/\d{2},\d{3}\.\d{2}/);
    await expect(page.getByText(/advancing/)).toBeVisible();
    await expect(page.getByRole('region', { name: 'Top gainers' }).getByRole('link').first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'Most traded' }).getByRole('link').first()).toContainText('Cr');
  });

  test('an index page shows valuation and returns with the long ones as yearly rates', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/markets');
    await page.getByRole('link', { name: /^Nifty 50/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Nifty 50' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Valuation' })).toContainText(/price divided by earnings/i);
    const rows = page.getByRole('table', { name: 'Index returns' }).getByRole('row');
    await expect(rows).toHaveCount(7); // header + 1M, 3M, 6M, 1Y, 3Y, 5Y
    await expect(rows.filter({ hasText: '3 years' })).toContainText('a year');
  });

  test('searching the stocks finds a company, and its page shows a price and past returns', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/markets/stocks');
    await expect(page.getByRole('table', { name: 'Nifty 50' }).getByRole('row')).toHaveCount(51);
    await page.getByRole('searchbox', { name: 'Search stocks' }).fill('reliance');
    await page.getByRole('region', { name: 'Search results' }).getByRole('link', { name: /RELIANCE/ }).first().click();
    await expect(page).toHaveURL(/\/markets\/stocks\/RELIANCE$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/RELIANCE/i);
    await expect(page.getByText('Last close').locator('xpath=following-sibling::p[1]')).toContainText('₹');
    const returns = page.getByRole('table', { name: 'Price change over time' }).getByRole('row');
    await expect(returns).toHaveCount(6);
    await expect(page.getByText(/not adjusted for splits, bonus issues or dividends/i)).toBeVisible();
  });

  test('the watchlist is kept by the server: add, see it on the list, reload, remove', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/markets/stocks/TCS');
    await page.getByRole('button', { name: 'Add to watchlist' }).click();
    await expect(page.getByRole('button', { name: 'Remove from watchlist' })).toBeVisible();

    await page.goto('/markets/indices/Nifty%2050');
    await page.getByRole('button', { name: 'Add to watchlist' }).click();
    await expect(page.getByRole('button', { name: 'Remove from watchlist' })).toBeVisible();

    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Watchlist' }).click();
    const list = page.getByRole('list', { name: 'Your watchlist' });
    await expect(list.getByRole('listitem')).toHaveCount(2);
    await page.reload();
    await expect(list.getByRole('listitem')).toHaveCount(2);
    await expect(list).toContainText('TATA CONSULTANCY');
    await expect(list).toContainText('Nifty 50');

    await list.getByRole('button', { name: /Remove TATA CONSULTANCY/ }).click();
    await expect(list.getByRole('listitem')).toHaveCount(1);
  });

  test('mutual funds: categories are ranked, a fund shows a NAV, a chart, returns and how bumpy it was', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/markets/funds');
    await expect(page.getByRole('table', { name: 'Index funds' }).getByRole('row').nth(1)).toContainText('%');
    await expect(page.getByText(/not a recommendation/i)).toBeVisible();
    await page.getByRole('group', { name: 'Fund categories' }).getByRole('button', { name: 'Small cap' }).click();
    await expect(page.getByRole('table', { name: 'Small cap' })).toBeVisible();
    await page.getByRole('table', { name: 'Small cap' }).getByRole('link').first().click();
    await expect(page).toHaveURL(/\/markets\/funds\/\d+$/);
    await expect(page.getByText(/^NAV of /)).toBeVisible();
    await expect(page.getByRole('img', { name: /^NAV from ₹/ })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Fund returns' })).toContainText('a year');
    await expect(page.getByRole('region', { name: 'How bumpy has it been?' })).toContainText(/fallen as much as/);
    await expect(page.getByText(/Past performance does not predict future returns/)).toBeVisible();
  });

  test('searching mutual funds by name finds the scheme', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/markets/funds');
    await page.getByRole('searchbox', { name: 'Search any fund' }).fill('parag parikh flexi');
    await page.getByRole('region', { name: 'Search results' }).getByRole('link', { name: /Parag Parikh Flexi Cap/ }).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Parag Parikh Flexi Cap');
  });
});

test.describe('When the data sources fail', () => {
  test('the overview says so, shows no numbers, and recovers on Try again', async ({ page }) => {
    await registerNewUser(page);
    let fail = true;
    await page.route('**/api/v1/markets/overview', (route) =>
      fail
        ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'MARKET_DATA_UNAVAILABLE', message: 'Market data is not reachable right now. Please try again in a few minutes.' } }) })
        : route.continue(),
    );
    await page.goto('/markets');
    await expect(page.getByText(/market data is not reachable right now/i)).toBeVisible();
    await expect(page.getByText(/advancing/)).toHaveCount(0);
    await expect(page.getByText(/^Nifty 50$/)).toHaveCount(0);
    fail = false;
    test.skip(!reachable, 'Cannot check recovery without the real data');
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByText(/End-of-day data from NSE India/)).toBeVisible();
  });

  test('an unknown stock says it cannot be found instead of showing anything made up', async ({ page }) => {
    test.skip(!reachable, 'Needs the data source to say "not found"');
    await registerNewUser(page);
    await page.goto('/markets/stocks/NOSUCHSTOCKXYZ');
    await expect(page.getByText(/could not find that stock/i)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to stocks' })).toBeVisible();
  });
});
