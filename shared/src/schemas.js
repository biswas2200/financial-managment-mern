/**
 * Zod schemas shared by the API (request validation) and the React forms.
 * One source of truth means the browser and the server reject exactly the same input.
 */
import { z } from 'zod';
import { toMinor, MAX_AMOUNT_MINOR } from './money.js';
import { parseDateInput } from './dates.js';
import { TRANSACTION_TYPES, PAYMENT_METHODS } from './categories.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const email = z.string().trim().toLowerCase().email('Enter a valid email address');
export const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use the YYYY-MM format');

export const passwordRule = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Use at most 72 characters')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

/** "450.50" | 450.5 → 45050 paise, with the MoneyError text as the form message. */
const rupeeAmount = z.union([z.string(), z.number()]).transform((value, ctx) => {
  try {
    return toMinor(value);
  } catch (err) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: err.message });
    return z.NEVER;
  }
});

const paiseAmount = z
  .number({ invalid_type_error: 'Amount must be a number of paise' })
  .int('Amount must be whole paise')
  .positive('Amount must be greater than zero')
  .max(MAX_AMOUNT_MINOR, 'Amount exceeds the per-transaction limit');

function dateField({ allowFuture }) {
  return z.union([z.string(), z.date()]).transform((value, ctx) => {
    const date = parseDateInput(value);
    if (!date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid date' });
      return z.NEVER;
    }
    if (!allowFuture && date.getTime() > Date.now() + DAY_MS) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Date can't be in the future" });
      return z.NEVER;
    }
    return date;
  });
}

/** Query-string values arrive as "" when a filter is cleared; treat that as absent. */
const optionalQuery = (schema) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), schema.optional());

// ---------- Auth ----------

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(60, 'Name is too long'),
  email,
  password: passwordRule,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(60, 'Name is too long'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordRule,
});

// ---------- Transactions ----------

const transactionFields = {
  type: z.enum(TRANSACTION_TYPES, { errorMap: () => ({ message: 'Choose income or expense' }) }),
  category: z.string().regex(/^[a-f\d]{24}$/i, 'Choose a category'),
  description: z.string().trim().min(1, 'Add a short description').max(120, 'Keep it under 120 characters'),
  merchant: z.string().trim().max(60, 'Keep it under 60 characters').optional(),
  date: dateField({ allowFuture: false }),
  paymentMethod: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: 'Choose a payment method' }) }).default('UPI'),
  notes: z.string().trim().max(500, 'Keep notes under 500 characters').optional(),
  tags: z.array(z.string().trim().min(1).max(24)).max(5, 'Use at most 5 tags').optional(),
};

/** Used by the React form: amount is typed in rupees and converted to paise. */
export const transactionFormSchema = z.object({ ...transactionFields, amount: rupeeAmount });

/** Used by the API: amount must already be integer paise. */
export const transactionApiSchema = z.object({ ...transactionFields, amount: paiseAmount });

export const SORT_OPTIONS = ['-date', 'date', '-amount', 'amount'];

export const transactionQuerySchema = z.object({
  type: optionalQuery(z.enum(TRANSACTION_TYPES)),
  category: optionalQuery(objectId),
  paymentMethod: optionalQuery(z.enum(PAYMENT_METHODS)),
  from: optionalQuery(dateField({ allowFuture: true })),
  to: optionalQuery(dateField({ allowFuture: true })),
  q: optionalQuery(z.string().trim().max(60)),
  min: optionalQuery(z.coerce.number().int().nonnegative()),
  max: optionalQuery(z.coerce.number().int().positive()),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(SORT_OPTIONS).default('-date'),
});

// ---------- Categories & budgets ----------

export const categoryApiSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(30, 'Name is too long'),
  type: z.enum(TRANSACTION_TYPES),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Use a hex colour like #1baf7a').optional(),
  icon: z.string().trim().max(40).optional(),
});

export const budgetApiSchema = z.object({
  category: objectId,
  month: monthKey,
  limit: paiseAmount,
});

export const budgetFormSchema = z.object({
  category: z.string().regex(/^[a-f\d]{24}$/i, 'Choose a category'),
  month: monthKey,
  limit: rupeeAmount,
});

// ---------- Analytics & assistant ----------

export const rangeQuerySchema = z.object({
  from: optionalQuery(dateField({ allowFuture: true })),
  to: optionalQuery(dateField({ allowFuture: true })),
  months: z.coerce.number().int().min(1).max(24).default(6),
  month: optionalQuery(monthKey),
  type: z.enum(TRANSACTION_TYPES).default('expense'),
});

export const assistantMessageSchema = z.object({
  text: z.string().trim().min(1, 'Type a message').max(500, 'Keep messages under 500 characters'),
});
