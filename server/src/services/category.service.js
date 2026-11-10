import { DEFAULT_CATEGORIES } from '@kosha/shared';
import { Category } from '../models/Category.js';
import { Transaction } from '../models/Transaction.js';
import { Budget } from '../models/Budget.js';
import { ApiError } from '../utils/ApiError.js';
import { toObjectId } from '../utils/ids.js';

export function seedDefaultCategories(userId) {
  return Category.insertMany(DEFAULT_CATEGORIES.map((c) => ({ ...c, user: userId, isDefault: true })));
}

export async function listCategories(userId, { type, withUsage = false } = {}) {
  const filter = { user: userId };
  if (type) filter.type = type;
  const categories = await Category.find(filter).sort({ type: 1, name: 1 });
  if (!withUsage) return categories;

  const usage = await Transaction.aggregate([
    { $match: { user: toObjectId(userId) } },
    { $group: { _id: '$category', count: { $sum: 1 }, total: { $sum: '$amount' } } },
  ]);
  const byId = new Map(usage.map((u) => [String(u._id), u]));
  return categories.map((c) => ({
    ...c.toJSON(),
    transactionCount: byId.get(c.id)?.count ?? 0,
    totalAmount: byId.get(c.id)?.total ?? 0,
  }));
}

export async function getOwnedCategory(userId, categoryId) {
  const category = await Category.findOne({ _id: categoryId, user: userId });
  if (!category) throw ApiError.notFound('Category not found');
  return category;
}

export function createCategory(userId, data) {
  return Category.create({ ...data, user: userId, isDefault: false });
}

export async function updateCategory(userId, categoryId, data) {
  const category = await getOwnedCategory(userId, categoryId);
  if (data.type && data.type !== category.type) {
    const used = await Transaction.countDocuments({ user: userId, category: category._id });
    if (used) throw ApiError.conflict("A category with transactions can't switch between income and expense");
  }
  Object.assign(category, data);
  return category.save();
}

export async function deleteCategory(userId, categoryId) {
  const category = await getOwnedCategory(userId, categoryId);
  const used = await Transaction.countDocuments({ user: userId, category: category._id });
  if (used) {
    throw ApiError.conflict(
      `This category is used by ${used} transaction${used === 1 ? '' : 's'}. Move or delete them first.`,
    );
  }
  await Budget.deleteMany({ user: userId, category: category._id });
  await category.deleteOne();
}
