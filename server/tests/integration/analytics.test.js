import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { useTestDatabase } from '../helpers/db.js';
import { signUp } from '../helpers/auth.js';
import { getSummary } from '../../src/services/analytics.service.js';

const app = createApp();
const base = '/api/v1/analytics';

/**
 * Fixture with hand-computed expectations.
 *   Sep: income 80,000  expense 25,000
 *   Oct: income 1,00,000 expense 37,000 (incl. a 23:30 IST entry on 31 Oct)
 *   Nov: income 85,000  expense 22,500 (incl. a 00:30 IST entry on 1 Nov)
 */
async function seedFixture(ctx) {
  const c = ctx.categories;
  const rows = [
    ['income', 8000000, 'Salary', 'Salary', '2026-09-01'],
    ['expense', 2000000, 'Rent & Housing', 'Rent', '2026-09-05'],
    ['expense', 500000, 'Groceries', 'Groceries', '2026-09-12'],
    ['income', 8500000, 'Salary', 'Salary', '2026-10-01'],
    ['income', 1500000, 'Freelance', 'Logo project', '2026-10-03'],
    ['expense', 2200000, 'Rent & Housing', 'Rent', '2026-10-05'],
    ['expense', 600000, 'Groceries', 'Monthly stock-up', '2026-10-10', 'DMart'],
    ['expense', 250000, 'Dining Out', 'Dinner', '2026-10-11', 'Swiggy'],
    ['expense', 150000, 'Dining Out', 'Lunch', '2026-10-18', 'Swiggy'],
    ['expense', 400000, 'Shopping', 'Shoes', '2026-10-20', 'Amazon'],
    ['expense', 100000, 'Groceries', 'Late-night milk', '2026-10-31T18:00:00.000Z'], // 23:30 IST 31 Oct
    ['expense', 50000, 'Transport', 'Cab home', '2026-10-31T19:00:00.000Z'], // 00:30 IST 1 Nov
    ['income', 8500000, 'Salary', 'Salary', '2026-11-02'],
    ['expense', 2200000, 'Rent & Housing', 'Rent', '2026-11-05'],
  ];
  for (const [type, amount, cat, description, date, merchant] of rows) {
    await ctx.agent
      .post('/api/v1/transactions')
      .send({ type, amount, category: c[cat].id, description, date, merchant })
      .expect(201);
  }
}

describe('Analytics API (MongoDB aggregation pipelines)', () => {
  useTestDatabase();

  let ctx;
  beforeEach(async () => {
    ctx = await signUp(app);
    await seedFixture(ctx);
  });

  it('requires authentication', async () => {
    await request(app).get(`${base}/summary`).expect(401);
  });

  describe('GET /summary', () => {
    it('totals a full month and compares it with the previous month', async () => {
      const res = await ctx.agent.get(`${base}/summary?month=2026-10`).expect(200);
      expect(res.body).toMatchObject({
        income: 10000000,
        expense: 3700000,
        net: 6300000,
        savingsRate: 63,
        count: 8,
        avgDailyExpense: 119355,
        previous: { income: 8000000, expense: 2500000, net: 5500000 },
        change: { income: 25, expense: 48, net: 14.5 },
        balance: 18050000,
      });
      expect(res.body.period.label).toBe('2026-10');
    });

    it('buckets late-night entries by Indian time, not UTC', async () => {
      const nov = await ctx.agent.get(`${base}/summary?month=2026-11`).expect(200);
      expect(nov.body.expense).toBe(2250000);
    });

    it('compares month-to-date with the same days of last month', async () => {
      const now = new Date('2026-11-10T15:00:00+05:30');
      const s = await getSummary(ctx.user.id, {}, now);
      expect(s.period).toMatchObject({ label: '2026-11', partial: true });
      expect(s.income).toBe(8500000);
      expect(s.expense).toBe(2250000);
      // 1 Oct → 10 Oct 15:00 IST
      expect(s.previous).toMatchObject({ income: 10000000, expense: 2800000 });
    });

    it('supports a custom date range', async () => {
      const res = await ctx.agent.get(`${base}/summary?from=2026-10-10&to=2026-10-20`).expect(200);
      expect(res.body.expense).toBe(1400000);
      expect(res.body.period.label).toBe('custom');
    });

    it('returns zeros and a null savings rate for an empty period', async () => {
      const res = await ctx.agent.get(`${base}/summary?month=2025-01`).expect(200);
      expect(res.body).toMatchObject({ income: 0, expense: 0, net: 0, savingsRate: null, count: 0 });
    });
  });

  it('GET /by-category ranks categories with their share of the total', async () => {
    const res = await ctx.agent.get(`${base}/by-category?month=2026-10&type=expense`).expect(200);
    expect(res.body.total).toBe(3700000);
    expect(res.body.items.map((i) => [i.name, i.total, i.share])).toEqual([
      ['Rent & Housing', 2200000, 59.5],
      ['Groceries', 700000, 18.9],
      ['Dining Out', 400000, 10.8],
      ['Shopping', 400000, 10.8],
    ]);
    expect(res.body.items[1]).toMatchObject({ count: 2, icon: 'shopping-basket' });
  });

  it('GET /trend returns zero-filled monthly income vs expense', async () => {
    const res = await ctx.agent.get(`${base}/trend?months=5&end=2026-11`).expect(200);
    expect(res.body).toEqual([
      { month: '2026-07', income: 0, expense: 0, net: 0 },
      { month: '2026-08', income: 0, expense: 0, net: 0 },
      { month: '2026-09', income: 8000000, expense: 2500000, net: 5500000 },
      { month: '2026-10', income: 10000000, expense: 3700000, net: 6300000 },
      { month: '2026-11', income: 8500000, expense: 2250000, net: 6250000 },
    ]);
  });

  it('GET /daily returns every day of the month for the heatmap', async () => {
    const res = await ctx.agent.get(`${base}/daily?month=2026-10`).expect(200);
    expect(res.body).toHaveLength(31);
    const day = (d) => res.body.find((r) => r.date === d);
    expect(day('2026-10-01')).toEqual({ date: '2026-10-01', income: 8500000, expense: 0, count: 1 });
    expect(day('2026-10-11')).toMatchObject({ expense: 250000 });
    expect(day('2026-10-31')).toMatchObject({ expense: 100000 });
    expect(day('2026-10-15')).toMatchObject({ expense: 0, count: 0 });
  });

  it('GET /weekday totals spending per day of week (Mon → Sun)', async () => {
    const res = await ctx.agent.get(`${base}/weekday?month=2026-10`).expect(200);
    expect(res.body.map((d) => d.day)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    const total = Object.fromEntries(res.body.map((d) => [d.day, d.total]));
    expect(total).toEqual({ Mon: 2200000, Tue: 400000, Wed: 0, Thu: 0, Fri: 0, Sat: 700000, Sun: 400000 });
  });

  it('GET /merchants ranks merchants by spend', async () => {
    const res = await ctx.agent.get(`${base}/merchants?month=2026-10&limit=5`).expect(200);
    expect(res.body).toEqual([
      { merchant: 'DMart', total: 600000, count: 1 },
      { merchant: 'Amazon', total: 400000, count: 1 },
      { merchant: 'Swiggy', total: 400000, count: 2 },
    ]);
  });

  it('GET /category-trend stacks the top categories per month and folds the rest into Other', async () => {
    const res = await ctx.agent.get(`${base}/category-trend?months=2&end=2026-10&top=2`).expect(200);
    expect(res.body.months).toEqual(['2026-09', '2026-10']);
    expect(res.body.series.map((s) => [s.name, s.values])).toEqual([
      ['Rent & Housing', [2000000, 2200000]],
      ['Groceries', [500000, 700000]],
      ['Other', [0, 800000]],
    ]);
  });

  it('isolates analytics per user', async () => {
    const other = await signUp(app);
    const res = await other.agent.get(`${base}/summary?month=2026-10`).expect(200);
    expect(res.body.income).toBe(0);
    expect(res.body.balance).toBe(0);
  });
});
