import mongoose from 'mongoose';
import { MAX_AMOUNT_MINOR } from '@kosha/shared';
import { toJSONPlugin } from './plugins/toJSON.js';

const budgetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    /** Calendar month in IST, "YYYY-MM". */
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    /** Monthly limit in integer paise. */
    limit: {
      type: Number,
      required: true,
      min: 1,
      max: MAX_AMOUNT_MINOR,
      validate: { validator: Number.isInteger, message: 'Limit must be whole paise' },
    },
  },
  { timestamps: true },
);

budgetSchema.index({ user: 1, month: 1, category: 1 }, { unique: true });
budgetSchema.plugin(toJSONPlugin);

export const Budget = mongoose.models.Budget ?? mongoose.model('Budget', budgetSchema);
