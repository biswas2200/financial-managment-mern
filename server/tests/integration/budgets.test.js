import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../../src/app.js';
import { useTestDatabase } from '../helpers/db.js';
import { signUp } from '../helpers/auth.js';

const app = createApp();
const base = '/api/v1/budgets';

describe('Budgets API', () => {
  useTestDatabase();

  let ctx;
  beforeEach(async () => {
    ctx = await signUp(app);
  });

  it('upserts one budget per category per month', async () => {
    const body = { category: ctx.categories.Groceries.id, month: '2026-11', limit: 1200000 };
    const first = await ctx.agent.put(base).send(body).expect(200);
    const second = await ctx.agent.put(base).send({ ...body, limit: 1500000 }).expect(200);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.limit).toBe(1500000);

    const list = await ctx.agent.get(`${base}?month=2026-11`).expect(200);
    expect(list.body.items).toHaveLength(1);
  });

  it('reports spent, remaining and percentage used for the month', async () => {
    const g = ctx.categories.Groceries.id;
    await ctx.agent.put(base).send({ category: g, month: '2026-11', limit: 1000000 }).expect(200);
    for (const [amount, date] of [
      [400000, '2026-11-02'],
      [350000, '2026-11-09'],
      [999900, '2026-10-30'], // previous month, must not count
    ]) {
      await ctx.agent
        .post('/api/v1/transactions')
        .send({ type: 'expense', amount, category: g, description: 'Groceries', date })
        .expect(201);
    }

    const res = await ctx.agent.get(`${base}?month=2026-11`).expect(200);
    expect(res.body.items[0]).toMatchObject({
      month: '2026-11',
      limit: 1000000,
      spent: 750000,
      remaining: 250000,
      percentUsed: 75,
      status: 'warning',
      category: { name: 'Groceries' },
    });
    expect(res.body.totals).toEqual({ limit: 1000000, spent: 750000, remaining: 250000 });
  });

  it('flags over-budget categories', async () => {
    const d = ctx.categories['Dining Out'].id;
    await ctx.agent.put(base).send({ category: d, month: '2026-11', limit: 100000 });
    await ctx.agent
      .post('/api/v1/transactions')
      .send({ type: 'expense', amount: 150000, category: d, description: 'Party', date: '2026-11-04' });
    const res = await ctx.agent.get(`${base}?month=2026-11`).expect(200);
    expect(res.body.items[0]).toMatchObject({ percentUsed: 150, remaining: -50000, status: 'over' });
  });

  it('only allows budgets on expense categories', async () => {
    await ctx.agent
      .put(base)
      .send({ category: ctx.categories.Salary.id, month: '2026-11', limit: 100000 })
      .expect(400);
  });

  it('validates the month key', async () => {
    await ctx.agent
      .put(base)
      .send({ category: ctx.categories.Groceries.id, month: 'Nov-2026', limit: 100000 })
      .expect(400);
    await ctx.agent.get(`${base}?month=2026-13`).expect(400);
  });

  it('deletes a budget and isolates users', async () => {
    const created = await ctx.agent
      .put(base)
      .send({ category: ctx.categories.Health.id, month: '2026-11', limit: 300000 })
      .expect(200);
    const other = await signUp(app);
    await other.agent.delete(`${base}/${created.body.id}`).expect(404);
    await ctx.agent.delete(`${base}/${created.body.id}`).expect(204);
  });

  it('can copy last month’s budgets into a new month', async () => {
    await ctx.agent.put(base).send({ category: ctx.categories.Groceries.id, month: '2026-10', limit: 900000 });
    await ctx.agent.put(base).send({ category: ctx.categories.Transport.id, month: '2026-10', limit: 300000 });
    const res = await ctx.agent.post(`${base}/copy`).send({ from: '2026-10', to: '2026-11' }).expect(200);
    expect(res.body.copied).toBe(2);
    const list = await ctx.agent.get(`${base}?month=2026-11`).expect(200);
    expect(list.body.items).toHaveLength(2);
  });
});
