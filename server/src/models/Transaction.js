import mongoose from 'mongoose';
import { TRANSACTION_TYPES, PAYMENT_METHODS, MAX_AMOUNT_MINOR } from '@kosha/shared';
import { toJSONPlugin } from './plugins/toJSON.js';

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    /** Integer paise (₹1 = 100). Never a float. */
    amount: {
      type: Number,
      required: true,
      min: [1, 'Amount must be greater than zero'],
      max: [MAX_AMOUNT_MINOR, 'Amount exceeds the per-transaction limit'],
      validate: { validator: Number.isInteger, message: 'Amount must be whole paise' },
    },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    description: { type: String, required: true, trim: true, maxlength: 120 },
    merchant: { type: String, trim: true, maxlength: 60 },
    date: { type: Date, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'UPI' },
    notes: { type: String, trim: true, maxlength: 500 },
    tags: { type: [String], default: undefined },
    /** Where the entry came from: typed by the user, or confirmed from a Copilot suggestion. */
    source: { type: String, enum: ['manual', 'copilot'], default: 'manual' },
  },
  { timestamps: true },
);

// Indexes match the hot queries: recent history, per-category drill-down, income/expense splits.
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1, date: -1 });

transactionSchema.plugin(toJSONPlugin);

export const Transaction =
  mongoose.models.Transaction ?? mongoose.model('Transaction', transactionSchema);
