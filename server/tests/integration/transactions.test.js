import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { useTestDatabase } from '../helpers/db.js';
import { signUp } from '../helpers/auth.js';

const app = createApp();
const base = '/api/v1/transactions';

describe('Transactions API', () => {
  useTestDatabase();

  let ctx;
  const txn = (overrides = {}) => ({
    type: 'expense',
    amount: 45050,
    category: ctx.categories.Groceries.id,
    description: 'Weekly groceries',
    merchant: 'DMart',
    date: '2026-11-08',
    paymentMethod: 'UPI',
    ...overrides,
  });

  beforeEach(async () => {
    ctx = await signUp(app);
  });

  describe('create', () => {
    it('stores integer paise and returns the populated category', async () => {
      const res = await ctx.agent.post(base).send(txn()).expect(201);
      expect(res.body).toMatchObject({
        type: 'expense',
        amount: 45050,
        description: 'Weekly groceries',
        source: 'manual',
        category: { name: 'Groceries', type: 'expense' },
      });
      expect(res.body.id).toMatch(/^[a-f\d]{24}$/);
    });

    it('rejects rupee floats; the API speaks paise', async () => {
      const res = await ctx.agent.post(base).send(txn({ amount: 450.5 })).expect(400);
      expect(res.body.error.details[0].path).toBe('amount');
    });

    it('rejects a category whose type does not match', async () => {
      const res = await ctx.agent
        .post(base)
        .send(txn({ type: 'income' }))
        .expect(400);
      expect(res.body.error.message).toMatch(/category/i);
    });

    it("rejects another user's category", async () => {
      const other = await signUp(app);
      await ctx.agent
        .post(base)
        .send(txn({ category: other.categories.Groceries.id }))
        .expect(404);
    });

    it('requires description, category and date', async () => {
      const res = await ctx.agent.post(base).send({ type: 'expense', amount: 100 }).expect(400);
      const paths = res.body.error.details.map((d) => d.path);
      expect(paths).toEqual(expect.arrayContaining(['category', 'description', 'date']));
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      const c = ctx.categories;
      const rows = [
        txn({ amount: 8500000, type: 'income', category: c.Salary.id, description: 'Salary', date: '2026-11-01', paymentMethod: 'Bank' }),
        txn({ amount: 2200000, category: c['Rent & Housing'].id, description: 'Rent', date: '2026-11-05', paymentMethod: 'Bank' }),
        txn({ amount: 45050, date: '2026-11-08' }),
        txn({ amount: 38000, category: c['Dining Out'].id, description: 'Biryani night', merchant: 'Swiggy', date: '2026-10-28' }),
        txn({ amount: 64900, category: c.Subscriptions.id, description: 'Streaming', merchant: 'Netflix', date: '2026-10-15', paymentMethod: 'Card' }),
      ];
      for (const r of rows) await ctx.agent.post(base).send(r).expect(201);
    });

    it('returns newest first with paging metadata and totals', async () => {
      const res = await ctx.agent.get(`${base}?limit=2`).expect(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].description).toBe('Weekly groceries');
      expect(res.body).toMatchObject({ page: 1, limit: 2, total: 5, totalPages: 3 });
      expect(res.body.summary).toEqual({ income: 8500000, expense: 2347950, net: 6152050, count: 5 });
    });

    it('filters by type, date range, amount range and payment method', async () => {
      const byType = await ctx.agent.get(`${base}?type=income`).expect(200);
      expect(byType.body.total).toBe(1);

      const oct = await ctx.agent.get(`${base}?from=2026-10-01&to=2026-10-31`).expect(200);
      expect(oct.body.items.map((t) => t.description).sort()).toEqual(['Biryani night', 'Streaming']);

      const mid = await ctx.agent.get(`${base}?min=40000&max=100000`).expect(200);
      expect(mid.body.items.map((t) => t.amount).sort()).toEqual([45050, 64900]);

      const card = await ctx.agent.get(`${base}?paymentMethod=Card`).expect(200);
      expect(card.body.total).toBe(1);
    });

    it('includes the whole "to" day', async () => {
      const res = await ctx.agent.get(`${base}?from=2026-11-08&to=2026-11-08`).expect(200);
      expect(res.body.total).toBe(1);
    });

    it('searches description and merchant case-insensitively, regex-safe', async () => {
      const res = await ctx.agent.get(`${base}?q=swig`).expect(200);
      expect(res.body.items[0].merchant).toBe('Swiggy');
      await ctx.agent.get(`${base}?q=${encodeURIComponent('(*')}`).expect(200);
    });

    it('filters by category and sorts by amount', async () => {
      const res = await ctx.agent.get(`${base}?type=expense&sort=-amount`).expect(200);
      expect(res.body.items[0].description).toBe('Rent');
      const groceries = await ctx.agent.get(`${base}?category=${ctx.categories.Groceries.id}`).expect(200);
      expect(groceries.body.total).toBe(1);
    });

    it('never leaks other users’ transactions', async () => {
      const other = await signUp(app);
      const res = await other.agent.get(base).expect(200);
      expect(res.body.total).toBe(0);
    });

    it('exports CSV', async () => {
      const res = await ctx.agent.get(`${base}/export.csv?type=expense`).expect(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="kosha-transactions/);
      const lines = res.text.trim().split('\n');
      expect(lines[0]).toBe('Date,Type,Category,Description,Merchant,Payment Method,Amount (INR)');
      expect(lines).toHaveLength(5);
      expect(lines.some((l) => l.includes('22000.00'))).toBe(true);
    });
  });

  describe('read, update, delete', () => {
    let created;
    beforeEach(async () => {
      created = (await ctx.agent.post(base).send(txn()).expect(201)).body;
    });

    it('gets one transaction', async () => {
      const res = await ctx.agent.get(`${base}/${created.id}`).expect(200);
      expect(res.body.id).toBe(created.id);
    });

    it('returns 400 for a malformed id and 404 for a missing one', async () => {
      await ctx.agent.get(`${base}/not-an-id`).expect(400);
      await ctx.agent.get(`${base}/665f1f77bcf86cd799439011`).expect(404);
    });

    it('updates fields and re-checks the category type', async () => {
      const res = await ctx.agent
        .patch(`${base}/${created.id}`)
        .send({ amount: 50000, description: 'Monthly groceries' })
        .expect(200);
      expect(res.body).toMatchObject({ amount: 50000, description: 'Monthly groceries' });

      await ctx.agent.patch(`${base}/${created.id}`).send({ type: 'income' }).expect(400);
    });

    it("cannot touch another user's transaction", async () => {
      const other = await signUp(app);
      await other.agent.get(`${base}/${created.id}`).expect(404);
      await other.agent.patch(`${base}/${created.id}`).send({ amount: 1 }).expect(404);
      await other.agent.delete(`${base}/${created.id}`).expect(404);
    });

    it('deletes', async () => {
      await ctx.agent.delete(`${base}/${created.id}`).expect(204);
      await ctx.agent.get(`${base}/${created.id}`).expect(404);
    });
  });

  it('requires authentication', async () => {
    await request(app).get(base).expect(401);
  });
});
