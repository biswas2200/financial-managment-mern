import mongoose from 'mongoose';
import { TRANSACTION_TYPES } from '@kosha/shared';
import { toJSONPlugin } from './plugins/toJSON.js';

const categorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 30 },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    color: { type: String, default: '#898781', match: /^#[0-9a-f]{6}$/i },
    icon: { type: String, default: 'circle' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// One "Groceries" per user and type, case-insensitive ("groceries" counts as a duplicate).
categorySchema.index(
  { user: 1, type: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);

categorySchema.plugin(toJSONPlugin);

export const Category = mongoose.models.Category ?? mongoose.model('Category', categorySchema);
