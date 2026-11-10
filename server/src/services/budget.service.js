import { monthRange } from '@kosha/shared';
import { Budget } from '../models/Budget.js';
import { Category } from '../models/Category.js';
import { ApiError } from '../utils/ApiError.js';
import { toObjectId } from '../utils/ids.js';

const WARNING_AT_PERCENT = 75;

export function budgetStatus(spent, limit) {
  if (spent > limit) return 'over';
  if ((spent / limit) * 100 >= WARNING_AT_PERCENT) return 'warning';
  return 'ok';
}

/**
 * Budgets for one month with actual spending, computed in a single aggregation:
 * Budget ⟶ $lookup(transactions in that month & category) ⟶ $lookup(category).
 */
export async function listBudgets(userId, month) {
  const uid = toObjectId(userId);
  const { start, end } = monthRange(month);

  const rows = await Budget.aggregate([
    { $match: { user: uid, month } },
    {
      $lookup: {
        from: 'transactions',
        let: { categoryId: '$category' },
        pipeline: [
          {
            $match: {
              user: uid,
              type: 'expense',
              date: { $gte: start, $lt: end },
              $expr: { $eq: ['$category', '$$categoryId'] },
            },
          },
          { $group: { _id: null, spent: { $sum: '$amount' }, count: { $sum: 1 } } },
        ],
        as: 'spending',
      },
    },
    { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category' } },
    { $unwind: '$category' },
    {
      $project: {
        _id: 0,
        id: { $toString: '$_id' },
        month: 1,
        limit: 1,
        spent: { $ifNull: [{ $first: '$spending.spent' }, 0] },
        transactionCount: { $ifNull: [{ $first: '$spending.count' }, 0] },
        category: {
          id: { $toString: '$category._id' },
          name: '$category.name',
          icon: '$category.icon',
          color: '$category.color',
        },
      },
    },
  ]);

  const items = rows
    .map((b) => ({
      ...b,
      remaining: b.limit - b.spent,
      percentUsed: Math.round((b.spent / b.limit) * 100),
      status: budgetStatus(b.spent, b.limit),
    }))
    .sort((a, b) => b.percentUsed - a.percentUsed);

  const totals = items.reduce(
    (t, b) => ({ limit: t.limit + b.limit, spent: t.spent + b.spent, remaining: t.remaining + b.remaining }),
    { limit: 0, spent: 0, remaining: 0 },
  );

  return { month, items, totals };
}

export async function upsertBudget(userId, { category, month, limit }) {
  const owned = await Category.findOne({ _id: category, user: userId });
  if (!owned) throw ApiError.notFound('Category not found');
  if (owned.type !== 'expense') {
    throw ApiError.badRequest('Budgets can only be set on expense categories', [
      { path: 'category', message: 'Pick an expense category' },
    ]);
  }

  const budget = await Budget.findOneAndUpdate(
    { user: userId, category, month },
    { $set: { limit } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return budget.populate({ path: 'category', select: 'name icon color' });
}

/** Copy every budget from one month into another without overwriting existing ones. */
export async function copyBudgets(userId, from, to) {
  const source = await Budget.find({ user: userId, month: from }).lean();
  if (!source.length) return { copied: 0 };

  const result = await Budget.bulkWrite(
    source.map((b) => ({
      updateOne: {
        filter: { user: userId, category: b.category, month: to },
        update: { $setOnInsert: { limit: b.limit } },
        upsert: true,
      },
    })),
  );
  return { copied: result.upsertedCount };
}

export async function deleteBudget(userId, id) {
  const deleted = await Budget.findOneAndDelete({ _id: id, user: userId });
  if (!deleted) throw ApiError.notFound('Budget not found');
}
