import { DEFAULT_CATEGORIES } from '@kosha/shared';
import { Category } from '../models/Category.js';

export function seedDefaultCategories(userId) {
  return Category.insertMany(DEFAULT_CATEGORIES.map((c) => ({ ...c, user: userId, isDefault: true })));
}

export function listCategories(userId, { type } = {}) {
  const filter = { user: userId };
  if (type) filter.type = type;
  return Category.find(filter).sort({ type: 1, name: 1 });
}
