/**
 * Loads Kosha's seed dataset into MongoDB.
 *
 *   npm run seed              # (re)creates the demo accounts, keeps any other users
 *   npm run seed -- --fresh   # drops the whole database first
 *
 * Demo logins (local development only):
 *   demo@kosha.app / Demo@1234   (a year of activity, budgets)
 *   riya@kosha.app / Demo@1234   (a lighter second account)
 */
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Category } from '../src/models/Category.js';
import { Transaction } from '../src/models/Transaction.js';
import { Budget } from '../src/models/Budget.js';
import { AssistantMessage } from '../src/models/AssistantMessage.js';
import { seedDefaultCategories } from '../src/services/category.service.js';
import { generateTransactions, generateBudgets } from '../src/seed/generator.js';

export const DEMO_PASSWORD = 'Demo@1234';
const ACCOUNTS = [
  { name: 'Aarav Mehta', email: 'demo@kosha.app', months: 12, seed: 2026, budgets: true },
  { name: 'Riya Desai', email: 'riya@kosha.app', months: 3, seed: 7, budgets: false },
];

async function removeUser(email) {
  const user = await User.findOne({ email });
  if (!user) return;
  await Promise.all([
    Transaction.deleteMany({ user: user._id }),
    Budget.deleteMany({ user: user._id }),
    Category.deleteMany({ user: user._id }),
    AssistantMessage.deleteMany({ user: user._id }),
  ]);
  await user.deleteOne();
}

async function main() {
  const fresh = process.argv.includes('--fresh');
  await connectDatabase(env.mongoUri);
  console.log(`[seed] Connected to ${mongoose.connection.name}`);

  if (fresh) {
    await mongoose.connection.dropDatabase();
    console.log('[seed] Dropped database');
  }
  await mongoose.connection.syncIndexes();

  const now = new Date();
  for (const account of ACCOUNTS) {
    await removeUser(account.email);
    const user = await User.create({
      name: account.name,
      email: account.email,
      passwordHash: await User.hashPassword(DEMO_PASSWORD),
    });
    const categories = (await seedDefaultCategories(user._id)).map((c) => ({
      id: c._id,
      name: c.name,
      type: c.type,
    }));

    const txns = generateTransactions({ categories, now, months: account.months, seed: account.seed });
    await Transaction.insertMany(txns.map((t) => ({ ...t, user: user._id })));

    let budgetCount = 0;
    if (account.budgets) {
      const budgets = generateBudgets({ categories, now, months: 4 });
      await Budget.insertMany(budgets.map((b) => ({ ...b, user: user._id })));
      budgetCount = budgets.length;
    }
    console.log(`[seed] ${account.email}: ${txns.length} transactions, ${budgetCount} budgets`);
  }

  console.log(`[seed] Done. Sign in with demo@kosha.app / ${DEMO_PASSWORD}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('[seed] Failed:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
