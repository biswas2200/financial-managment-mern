import { describe, it, expect } from 'vitest';
import { toDayKey } from '@kosha/shared';
import { createApp } from '../../src/app.js';
import { useTestDatabase } from '../helpers/db.js';
import { signUp } from '../helpers/auth.js';

const app = createApp();
const base = '/api/v1/balance';
const today = toDayKey(new Date());

async function add(ctx, type, amount, category) {
  await ctx.agent
    .post('/api/v1/transactions')
    .send({ type, amount, category: ctx.categories[category].id, description: category, date: today })
    .expect(201);
}
// A whole-day range: "today" is dated noon IST, which is still ahead of the clock early in the morning.
const summary = async (ctx) => (await ctx.agent.get(`/api/v1/analytics/summary?from=2020-01-01&to=${today}`).expect(200)).body;

describe('Balance: starting figure, negative balances and the demo bank', () => {
  useTestDatabase();

  it('starts at zero with nothing recorded', async () => {
    const ctx = await signUp(app);
    const res = await ctx.agent.get(base).expect(200);
    expect(res.body).toEqual({ balance: 0, openingBalance: 0, transactionsNet: 0 });
  });

  it('shows a negative balance when spending outruns income, exactly as before', async () => {
    const ctx = await signUp(app);
    await add(ctx, 'income', 100000, 'Salary');
    await add(ctx, 'expense', 450000, 'Rent & Housing');
    expect((await summary(ctx)).balance).toBe(-350000);
    expect((await ctx.agent.get(base)).body).toMatchObject({ balance: -350000, openingBalance: 0, transactionsNet: -350000 });
  });

  it('PUT sets the balance the user really has by adjusting the starting figure', async () => {
    const ctx = await signUp(app);
    await add(ctx, 'income', 100000, 'Salary');
    await add(ctx, 'expense', 450000, 'Rent & Housing');

    const res = await ctx.agent.put(base).send({ balance: 2500000 }).expect(200);
    expect(res.body).toEqual({ balance: 2500000, openingBalance: 2850000, transactionsNet: -350000 });
    expect((await summary(ctx)).balance).toBe(2500000);

    await add(ctx, 'expense', 100000, 'Groceries'); // later spending still moves it
    expect((await summary(ctx)).balance).toBe(2400000);
  });

  it('accepts a negative balance for someone who is overdrawn', async () => {
    const ctx = await signUp(app);
    const res = await ctx.agent.put(base).send({ balance: -125000 }).expect(200);
    expect(res.body.balance).toBe(-125000);
    expect((await summary(ctx)).balance).toBe(-125000);
  });

  it('does not touch the income and spending figures', async () => {
    const ctx = await signUp(app);
    await add(ctx, 'income', 100000, 'Salary');
    await ctx.agent.put(base).send({ balance: 9000000 }).expect(200);
    const s = await summary(ctx);
    expect(s).toMatchObject({ income: 100000, expense: 0, net: 100000 });
  });

  it('rejects fractional paise and absurd values', async () => {
    const ctx = await signUp(app);
    await ctx.agent.put(base).send({ balance: 10.5 }).expect(400);
    await ctx.agent.put(base).send({ balance: 1e15 }).expect(400);
    await ctx.agent.put(base).send({}).expect(400);
  });

  it('needs a session', async () => {
    await import('supertest').then(({ default: request }) => request(app).get(base).expect(401));
  });

  describe('demo bank', () => {
    it('returns a clearly simulated balance and saves nothing', async () => {
      const ctx = await signUp(app);
      const res = await ctx.agent.post(`${base}/bank-demo`).send({ bank: 'sample-savings' }).expect(200);
      expect(res.body).toMatchObject({ simulated: true, bank: { id: 'sample-savings' } });
      expect(Number.isInteger(res.body.balance)).toBe(true);
      expect(res.body.balance).toBeGreaterThan(0);
      expect(res.body.fetchedAt).toBeTruthy();
      expect((await ctx.agent.get(base)).body.openingBalance).toBe(0);
    });

    it('gives the same figure for the same user and bank, so a retry looks consistent', async () => {
      const ctx = await signUp(app);
      const a = await ctx.agent.post(`${base}/bank-demo`).send({ bank: 'sample-savings' }).expect(200);
      const b = await ctx.agent.post(`${base}/bank-demo`).send({ bank: 'sample-savings' }).expect(200);
      expect(a.body.balance).toBe(b.body.balance);
    });

    it('lists the demo banks and rejects an unknown one', async () => {
      const ctx = await signUp(app);
      const list = await ctx.agent.get(`${base}/banks`).expect(200);
      expect(list.body.length).toBeGreaterThanOrEqual(2);
      expect(list.body.every((b) => b.id && b.name)).toBe(true);
      await ctx.agent.post(`${base}/bank-demo`).send({ bank: 'real-bank' }).expect(400);
    });
  });
});
