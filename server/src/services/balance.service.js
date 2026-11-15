/**
 * The balance is what the user really has: an opening figure (money they had before
 * Kosha, which can be negative for an overdrawn account) plus every income minus every
 * expense recorded since. "Setting" a balance never rewrites transactions; it moves
 * the opening figure so that today's total matches what the user says.
 */
import { createHash } from 'node:crypto';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { ApiError } from '../utils/ApiError.js';
import { toObjectId } from '../utils/ids.js';

export async function netOfAllTransactions(userId) {
  const groups = await Transaction.aggregate([
    { $match: { user: toObjectId(userId) } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);
  const income = groups.find((g) => g._id === 'income')?.total ?? 0;
  const expense = groups.find((g) => g._id === 'expense')?.total ?? 0;
  return income - expense;
}

export async function getOpeningBalance(userId) {
  const user = await User.findById(userId).select('openingBalance').lean();
  return user?.openingBalance ?? 0;
}

export async function getBalance(userId) {
  const [openingBalance, transactionsNet] = await Promise.all([getOpeningBalance(userId), netOfAllTransactions(userId)]);
  return { balance: openingBalance + transactionsNet, openingBalance, transactionsNet };
}

export async function setBalance(userId, balance) {
  const transactionsNet = await netOfAllTransactions(userId);
  const openingBalance = balance - transactionsNet;
  await User.updateOne({ _id: userId }, { $set: { openingBalance } });
  return { balance, openingBalance, transactionsNet };
}

/**
 * Demo "fetch from my bank": there is no bank connection. These are sample accounts so the
 * flow can be shown end to end; the figure is made up (but stable for a user and bank).
 */
export const DEMO_BANKS = [
  { id: 'sample-savings', name: 'Sample Bank', account: 'Savings, ending 4821' },
  { id: 'sample-salary', name: 'Demo Credit Union', account: 'Salary account, ending 1307' },
  { id: 'sample-current', name: 'Example Co-operative Bank', account: 'Current account, ending 9054' },
];

export function fetchDemoBankBalance(userId, bankId, now = new Date()) {
  const bank = DEMO_BANKS.find((b) => b.id === bankId);
  if (!bank) {
    throw ApiError.badRequest('Choose one of the demo banks', [{ path: 'bank', message: 'Choose one of the demo banks' }]);
  }
  const digest = createHash('sha256').update(`${userId}:${bank.id}`).digest();
  const rupees = 40_000 + (digest.readUInt32BE(0) % 210_000); // ₹40,000 to ₹2,49,999
  const paise = digest.readUInt8(4) % 100;
  return { bank, balance: rupees * 100 + paise, fetchedAt: now.toISOString(), simulated: true };
}
