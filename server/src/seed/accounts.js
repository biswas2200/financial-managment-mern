/**
 * Removing accounts and what they made, for the seed scripts and for clearing out test accounts.
 */
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { Budget } from '../models/Budget.js';
import { Category } from '../models/Category.js';
import { AssistantMessage } from '../models/AssistantMessage.js';
import { WatchlistItem } from '../models/WatchlistItem.js';
import { removeMemberContent } from '../services/community.service.js';

/**
 * Removes everything one person made: money, budgets, categories, Copilot messages, watchlist, and their posts,
 * comments and likes (the counts on other people's posts follow). The account itself stays; the caller decides.
 */
export async function removeAccountData(userId) {
  await removeMemberContent(userId);
  await Promise.all([
    Transaction.deleteMany({ user: userId }),
    Budget.deleteMany({ user: userId }),
    Category.deleteMany({ user: userId }),
    AssistantMessage.deleteMany({ user: userId }),
    WatchlistItem.deleteMany({ user: userId }),
  ]);
}

/** Accounts made by automated tests and by reviews use these domains. `.test` is reserved, so no real person has one. */
export const TEST_DOMAINS = ['kosha.test', 'review.test'];

/**
 * Removes the accounts that automated tests created (emails on kosha.test or review.test), with everything they made.
 * It matches whole domains exactly, so nobody else can be caught by it. Pass `keep` to spare some.
 */
export async function removeTestAccounts({ domains = TEST_DOMAINS, keep = [] } = {}) {
  const escaped = domains.map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const spare = new Set(keep.map((e) => e.toLowerCase()));
  const users = (await User.find({ email: new RegExp(`^[^@\\s]+@(${escaped})$`, 'i') }, '_id email').lean()).filter((u) => !spare.has(u.email));
  for (const user of users) {
    await removeAccountData(user._id);
    await User.deleteOne({ _id: user._id });
  }
  return { accounts: users.length };
}
