import { defineConfig } from '@playwright/test';
import { CONSENT_GIVEN } from './consent.js';

/**
 * End-to-end tests drive the real app (React → Express → MongoDB) in the system
 * Google Chrome. Each test registers its own throwaway user, so the demo account
 * and other data are never touched.
 */
export default defineConfig({
  testDir: './specs',
  globalTeardown: './global-teardown.js', // removes the throwaway accounts the tests made
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../playwright-report' }]],
  outputDir: '../test-results',
  use: {
    baseURL: process.env.KOSHA_URL ?? 'http://localhost:5173',
    channel: 'chrome',
    headless: true,
    locale: 'en-IN',
    storageState: CONSENT_GIVEN, // the cookie banner has been answered; the cookie specs start from nothing
    timezoneId: 'Asia/Kolkata',
    viewport: { width: 1366, height: 860 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    cwd: '..',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
