/**
 * Removes the accounts that automated tests created (emails on kosha.test) and everything they made:
 * their posts, comments, likes, transactions and so on. Nobody else's data is touched.
 *
 *   npm run clean:test-data
 */
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { removeTestAccounts } from '../src/seed/accounts.js';

async function main() {
  await connectDatabase(env.mongoUri);
  console.log(`[clean] Connected to ${mongoose.connection.name}`);
  const { accounts } = await removeTestAccounts();
  console.log(`[clean] Removed ${accounts} test accounts and everything they made.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('[clean] Failed:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
