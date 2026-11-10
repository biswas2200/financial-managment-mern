import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  transactionFormSchema,
  transactionApiSchema,
  transactionQuerySchema,
  budgetApiSchema,
  categoryApiSchema,
} from '../src/schemas.js';
import { DEFAULT_CATEGORIES, PAYMENT_METHODS } from '../src/categories.js';

const OID = '665f1f77bcf86cd799439011';

describe('registerSchema', () => {
  it('accepts a valid sign-up and normalises email', () => {
    const r = registerSchema.parse({ name: ' Asha Rao ', email: 'Asha@Example.COM', password: 'secret123' });
    expect(r).toEqual({ name: 'Asha Rao', email: 'asha@example.com', password: 'secret123' });
  });

  it('requires passwords with at least 8 chars, a letter and a digit', () => {
    expect(registerSchema.safeParse({ name: 'Al', email: 'a@b.co', password: 'short1' }).success).toBe(false);
    expect(registerSchema.safeParse({ name: 'Al', email: 'a@b.co', password: 'allletters' }).success).toBe(false);
    expect(registerSchema.safeParse({ name: 'Al', email: 'a@b.co', password: '12345678' }).success).toBe(false);
  });

  it('rejects malformed email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
  });
});

describe('transactionFormSchema (client form → API payload)', () => {
  const valid = {
    type: 'expense',
    amount: '450.50',
    category: OID,
    description: 'Weekly groceries',
    date: '2026-11-08',
    paymentMethod: 'UPI',
  };

  it('converts the rupee string to integer paise and the date to a Date', () => {
    const r = transactionFormSchema.parse(valid);
    expect(r.amount).toBe(45050);
    expect(r.date).toBeInstanceOf(Date);
  });

  it('reports a friendly message for bad amounts', () => {
    const r = transactionFormSchema.safeParse({ ...valid, amount: '12.345' });
    expect(r.success).toBe(false);
    expect(r.error.issues[0].path).toEqual(['amount']);
    expect(r.error.issues[0].message).toMatch(/2 decimal/i);
  });

  it('requires a description and a category', () => {
    expect(transactionFormSchema.safeParse({ ...valid, description: '  ' }).success).toBe(false);
    expect(transactionFormSchema.safeParse({ ...valid, category: '' }).success).toBe(false);
  });

  it('rejects dates far in the future', () => {
    expect(transactionFormSchema.safeParse({ ...valid, date: '2099-01-01' }).success).toBe(false);
  });
});

describe('transactionApiSchema (server boundary)', () => {
  const valid = {
    type: 'income',
    amount: 8500000,
    category: OID,
    description: 'Salary',
    date: '2026-11-01',
    paymentMethod: 'Bank',
  };

  it('accepts integer paise', () => {
    expect(transactionApiSchema.parse(valid).amount).toBe(8500000);
  });

  it('rejects fractional paise, zero and negatives', () => {
    for (const amount of [10.5, 0, -100]) {
      expect(transactionApiSchema.safeParse({ ...valid, amount }).success).toBe(false);
    }
  });

  it('rejects invalid ObjectIds and unknown payment methods', () => {
    expect(transactionApiSchema.safeParse({ ...valid, category: 'abc' }).success).toBe(false);
    expect(transactionApiSchema.safeParse({ ...valid, paymentMethod: 'Bitcoin' }).success).toBe(false);
  });

  it('supports partial updates', () => {
    expect(transactionApiSchema.partial().parse({ description: 'Bonus' })).toEqual({ description: 'Bonus' });
  });
});

describe('transactionQuerySchema', () => {
  it('applies paging defaults and coerces numbers', () => {
    expect(transactionQuerySchema.parse({})).toMatchObject({ page: 1, limit: 20, sort: '-date' });
    expect(transactionQuerySchema.parse({ page: '3', limit: '50' })).toMatchObject({ page: 3, limit: 50 });
  });

  it('caps the page size', () => {
    expect(transactionQuerySchema.safeParse({ limit: '1000' }).success).toBe(false);
  });
});

describe('budgetApiSchema & categoryApiSchema', () => {
  it('validates month keys', () => {
    expect(budgetApiSchema.safeParse({ category: OID, month: '2026-11', limit: 500000 }).success).toBe(true);
    expect(budgetApiSchema.safeParse({ category: OID, month: '2026-13', limit: 500000 }).success).toBe(false);
  });

  it('validates category names and hex colours', () => {
    expect(categoryApiSchema.safeParse({ name: 'Pets', type: 'expense', color: '#1baf7a' }).success).toBe(true);
    expect(categoryApiSchema.safeParse({ name: 'P', type: 'expense' }).success).toBe(false);
    expect(categoryApiSchema.safeParse({ name: 'Pets', type: 'expense', color: 'green' }).success).toBe(false);
  });
});

describe('category catalog', () => {
  it('ships income and expense defaults with unique names per type', () => {
    const keys = DEFAULT_CATEGORIES.map((c) => `${c.type}:${c.name}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(DEFAULT_CATEGORIES.some((c) => c.type === 'income')).toBe(true);
    expect(DEFAULT_CATEGORIES.filter((c) => c.type === 'expense').length).toBeGreaterThanOrEqual(8);
  });

  it('lists supported payment methods', () => {
    expect(PAYMENT_METHODS).toEqual(['UPI', 'Card', 'Cash', 'Bank', 'Wallet']);
  });
});
