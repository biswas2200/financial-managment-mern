import { describe, it, expect } from 'vitest';
import { DEFAULT_CATEGORIES, toMonthKey, lastNMonthKeys } from '@kosha/shared';
import { generateTransactions, generateBudgets } from '../../src/seed/generator.js';

const NOW = new Date('2026-11-10T15:00:00+05:30');
const categories = DEFAULT_CATEGORIES.map((c, i) => ({ ...c, id: `cat${i}` }));
const byName = Object.fromEntries(categories.map((c) => [c.name, c]));

describe('seed dataset generator', () => {
  const txns = generateTransactions({ categories, now: NOW, months: 12, seed: 2026 });

  it('is deterministic for a given seed', () => {
    const again = generateTransactions({ categories, now: NOW, months: 12, seed: 2026 });
    expect(again).toHaveLength(txns.length);
    expect(again.slice(0, 20)).toEqual(txns.slice(0, 20));
  });

  it('produces a realistic volume of activity', () => {
    expect(txns.length).toBeGreaterThan(700);
    expect(txns.length).toBeLessThan(1600);
  });

  it('never creates future-dated or out-of-window entries', () => {
    const start = new Date('2025-11-01T00:00:00+05:30');
    for (const t of txns) {
      expect(t.date.getTime()).toBeLessThanOrEqual(NOW.getTime());
      expect(t.date.getTime()).toBeGreaterThanOrEqual(start.getTime());
    }
  });

  it('stores money as positive integer paise and matches category types', () => {
    const types = Object.fromEntries(categories.map((c) => [c.id, c.type]));
    for (const t of txns) {
      expect(Number.isInteger(t.amount)).toBe(true);
      expect(t.amount).toBeGreaterThan(0);
      expect(types[t.category]).toBe(t.type);
      expect(t.description.length).toBeGreaterThan(0);
    }
  });

  it('pays salary and rent once every month', () => {
    for (const month of lastNMonthKeys(13, '2026-11')) {
      const inMonth = txns.filter((t) => toMonthKey(t.date) === month);
      expect(inMonth.filter((t) => t.category === byName.Salary.id)).toHaveLength(1);
      expect(inMonth.filter((t) => t.category === byName['Rent & Housing'].id && t.description === 'Monthly rent')).toHaveLength(1);
    }
  });

  it('includes a festive-season shopping spike in the current month', () => {
    const shopping = (month) =>
      txns
        .filter((t) => t.category === byName.Shopping.id && toMonthKey(t.date) === month)
        .reduce((s, t) => s + t.amount, 0);
    const usual = ['2026-07', '2026-08', '2026-09'].map(shopping);
    const avg = usual.reduce((a, b) => a + b, 0) / usual.length;
    expect(shopping('2026-11')).toBeGreaterThan(avg * 1.5);
  });

  it('creates monthly budgets for the main spending categories', () => {
    const budgets = generateBudgets({ categories, now: NOW, months: 4 });
    const months = new Set(budgets.map((b) => b.month));
    expect([...months]).toEqual(['2026-08', '2026-09', '2026-10', '2026-11']);
    expect(budgets.every((b) => Number.isInteger(b.limit) && b.limit > 0)).toBe(true);
    expect(budgets.every((b) => categories.find((c) => c.id === b.category).type === 'expense')).toBe(true);
  });
});
