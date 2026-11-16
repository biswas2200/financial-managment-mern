/**
 * After the browser tests, remove the throwaway accounts they made (emails on kosha.test) and everything those
 * accounts posted, so Discussions and Learn are not left full of test posts. Real and sample accounts are not touched.
 * It only runs against a local server, and a failure here never fails the tests.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export default async function globalTeardown() {
  const url = process.env.KOSHA_URL ?? 'http://localhost:5173';
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url)) return;
  try {
    try {
      process.loadEnvFile(path.join(root, 'server/.env'));
    } catch {
      /* no .env: the defaults apply */
    }
    const { default: mongoose } = await import(path.join(root, 'server/node_modules/mongoose/index.js')).catch(() => import('mongoose'));
    const { connectDatabase } = await import('../server/src/config/db.js');
    const { env } = await import('../server/src/config/env.js');
    const { removeTestAccounts } = await import('../server/src/seed/accounts.js');
    await connectDatabase(env.mongoUri);
    const { accounts } = await removeTestAccounts();
    console.log(`\n[e2e] Removed ${accounts} test accounts and what they made.`);
    await mongoose.disconnect();
  } catch (err) {
    console.warn(`\n[e2e] Could not remove the test accounts (${err.message}). Run "npm run clean:test-data" later.`);
  }
}
