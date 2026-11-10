import { startOfDayIST, toDayKey, fromMinor } from '@kosha/shared';
import { Transaction } from '../models/Transaction.js';
import { Category } from '../models/Category.js';
import { ApiError } from '../utils/ApiError.js';
import { toObjectId, escapeRegex } from '../utils/ids.js';

const DAY_MS = 24 * 60 * 60 * 1000;
export const CATEGORY_FIELDS = { path: 'category', select: 'name type icon color' };

const SORTS = {
  '-date': { date: -1, _id: -1 },
  date: { date: 1, _id: 1 },
  '-amount': { amount: -1, date: -1 },
  amount: { amount: 1, date: -1 },
};

/** The category must belong to the user and match the transaction type. */
async function assertCategory(userId, categoryId, type) {
  const category = await Category.findOne({ _id: categoryId, user: userId });
  if (!category) throw ApiError.notFound('Category not found');
  if (category.type !== type) {
    const message = `"${category.name}" is an ${category.type} category. Pick an ${type} category.`;
    throw ApiError.badRequest(message, [{ path: 'category', message }]);
  }
  return category;
}

/** Translate validated query params into a MongoDB filter (also used by aggregations). */
export function buildFilter(userId, query = {}) {
  const filter = { user: toObjectId(userId) };
  if (query.type) filter.type = query.type;
  if (query.category) filter.category = toObjectId(query.category);
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;

  if (query.from || query.to) {
    filter.date = {};
    if (query.from) filter.date.$gte = startOfDayIST(query.from);
    // "to" is inclusive of the whole day.
    if (query.to) filter.date.$lt = new Date(startOfDayIST(query.to).getTime() + DAY_MS);
  }
  if (query.min !== undefined || query.max !== undefined) {
    filter.amount = {};
    if (query.min !== undefined) filter.amount.$gte = query.min;
    if (query.max !== undefined) filter.amount.$lte = query.max;
  }
  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ description: pattern }, { merchant: pattern }];
  }
  return filter;
}

export async function summarise(filter) {
  const groups = await Transaction.aggregate([
    { $match: filter },
    { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const income = groups.find((g) => g._id === 'income')?.total ?? 0;
  const expense = groups.find((g) => g._id === 'expense')?.total ?? 0;
  const count = groups.reduce((n, g) => n + g.count, 0);
  return { income, expense, net: income - expense, count };
}

export async function listTransactions(userId, query) {
  const filter = buildFilter(userId, query);
  const { page, limit, sort } = query;

  const [items, total, summary] = await Promise.all([
    Transaction.find(filter)
      .sort(SORTS[sort] ?? SORTS['-date'])
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(CATEGORY_FIELDS),
    Transaction.countDocuments(filter),
    summarise(filter),
  ]);

  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), summary };
}

export async function createTransaction(userId, data, { source = 'manual' } = {}) {
  await assertCategory(userId, data.category, data.type);
  const created = await Transaction.create({ ...data, user: userId, source });
  return created.populate(CATEGORY_FIELDS);
}

export async function getTransaction(userId, id) {
  const txn = await Transaction.findOne({ _id: id, user: userId }).populate(CATEGORY_FIELDS);
  if (!txn) throw ApiError.notFound('Transaction not found');
  return txn;
}

export async function updateTransaction(userId, id, changes) {
  const txn = await Transaction.findOne({ _id: id, user: userId });
  if (!txn) throw ApiError.notFound('Transaction not found');

  if (changes.type || changes.category) {
    await assertCategory(userId, changes.category ?? txn.category, changes.type ?? txn.type);
  }
  Object.assign(txn, changes);
  await txn.save();
  return txn.populate(CATEGORY_FIELDS);
}

export async function deleteTransaction(userId, id) {
  const deleted = await Transaction.findOneAndDelete({ _id: id, user: userId });
  if (!deleted) throw ApiError.notFound('Transaction not found');
}

// ---------- CSV export ----------

const CSV_HEADER = ['Date', 'Type', 'Category', 'Description', 'Merchant', 'Payment Method', 'Amount (INR)'];

function csvCell(value) {
  let text = value == null ? '' : String(value);
  // Neutralise spreadsheet formula injection (=, +, -, @ at the start of a cell).
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function exportCsv(userId, query) {
  const rows = await Transaction.find(buildFilter(userId, query))
    .sort(SORTS[query.sort] ?? SORTS['-date'])
    .limit(10000)
    .populate(CATEGORY_FIELDS)
    .lean();

  const lines = rows.map((t) =>
    [
      toDayKey(t.date),
      t.type,
      t.category?.name ?? '',
      t.description,
      t.merchant ?? '',
      t.paymentMethod,
      fromMinor(t.amount),
    ]
      .map(csvCell)
      .join(','),
  );
  return [CSV_HEADER.join(','), ...lines].join('\n') + '\n';
}
