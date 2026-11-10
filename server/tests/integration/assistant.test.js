import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { toDayKey, toMonthKey } from '@kosha/shared';
import { createApp } from '../../src/app.js';
import { useTestDatabase } from '../helpers/db.js';
import { signUp } from '../helpers/auth.js';

const base = '/api/v1/assistant';
const today = toDayKey(new Date());
const thisMonth = toMonthKey(new Date());

async function seed(ctx) {
  const c = ctx.categories;
  const rows = [
    ['income', 8500000, 'Salary', 'Salary', today],
    ['expense', 2200000, 'Rent & Housing', 'Rent', today],
    ['expense', 64000, 'Dining Out', 'Dinner', today, 'Swiggy'],
    ['expense', 38000, 'Dining Out', 'Lunch', today, 'Swiggy'],
  ];
  for (const [type, amount, cat, description, date, merchant] of rows) {
    await ctx.agent
      .post('/api/v1/transactions')
      .send({ type, amount, category: c[cat].id, description, date, merchant })
      .expect(201);
  }
}

describe('Assistant API: offline engine (no Gemini key)', () => {
  useTestDatabase();
  const app = createApp();
  let ctx;

  beforeEach(async () => {
    ctx = await signUp(app, { name: 'Meera Iyer' });
    await seed(ctx);
  });

  it('reports which engine is active', async () => {
    const res = await ctx.agent.get(`${base}/status`).expect(200);
    expect(res.body).toMatchObject({ provider: 'offline', geminiConfigured: false });
  });

  it('answers a spending question from real data, with a chart payload', async () => {
    const res = await ctx.agent.post(`${base}/message`).send({ text: 'How much did I spend this month?' }).expect(200);
    expect(res.body.message).toMatchObject({ role: 'assistant', provider: 'offline' });
    expect(res.body.message.content).toContain('₹23,020');
    expect(res.body.message.data.kind).toBe('summary');
  });

  it('drafts a transaction from natural language and saves it only after confirmation', async () => {
    const res = await ctx.agent
      .post(`${base}/message`)
      .send({ text: 'add 450 for groceries yesterday' })
      .expect(200);
    const msg = res.body.message;
    expect(msg.pendingAction).toMatchObject({
      type: 'create_transaction',
      status: 'pending',
      payload: { type: 'expense', amount: 45000, category: ctx.categories.Groceries.id },
    });

    const before = await ctx.agent.get('/api/v1/transactions?q=Groceries').expect(200);
    expect(before.body.total).toBe(0);

    const confirmed = await ctx.agent.post(`${base}/actions/${msg.id}/confirm`).expect(200);
    expect(confirmed.body.message.pendingAction.status).toBe('confirmed');
    expect(confirmed.body.result).toMatchObject({ amount: 45000, source: 'copilot' });

    await ctx.agent.post(`${base}/actions/${msg.id}/confirm`).expect(409);
  });

  it('asks a follow-up when the amount is missing', async () => {
    const res = await ctx.agent.post(`${base}/message`).send({ text: 'add an expense for groceries' }).expect(200);
    expect(res.body.message.pendingAction).toBeFalsy();
    expect(res.body.message.content).toMatch(/how much/i);
  });

  it('drafts and confirms a budget', async () => {
    const res = await ctx.agent
      .post(`${base}/message`)
      .send({ text: 'set a budget of 5000 for dining this month' })
      .expect(200);
    const msg = res.body.message;
    expect(msg.pendingAction).toMatchObject({ type: 'set_budget', payload: { limit: 500000, month: thisMonth } });

    await ctx.agent.post(`${base}/actions/${msg.id}/confirm`).expect(200);
    const budgets = await ctx.agent.get(`/api/v1/budgets?month=${thisMonth}`).expect(200);
    expect(budgets.body.items[0]).toMatchObject({ limit: 500000, spent: 102000, category: { name: 'Dining Out' } });
  });

  it('can cancel a draft', async () => {
    const res = await ctx.agent.post(`${base}/message`).send({ text: 'spent 300 on uber' }).expect(200);
    const cancelled = await ctx.agent.post(`${base}/actions/${res.body.message.id}/cancel`).expect(200);
    expect(cancelled.body.message.pendingAction.status).toBe('cancelled');
    await ctx.agent.post(`${base}/actions/${res.body.message.id}/confirm`).expect(409);
  });

  it('finds transactions by merchant', async () => {
    const res = await ctx.agent.post(`${base}/message`).send({ text: 'show my swiggy orders' }).expect(200);
    expect(res.body.message.data.kind).toBe('transactions');
    expect(res.body.message.data.items).toHaveLength(2);
  });

  it('keeps history per user and can clear it', async () => {
    await ctx.agent.post(`${base}/message`).send({ text: 'hi' }).expect(200);
    const history = await ctx.agent.get(`${base}/history`).expect(200);
    expect(history.body.map((m) => m.role)).toEqual(['user', 'assistant']);

    const other = await signUp(app);
    expect((await other.agent.get(`${base}/history`).expect(200)).body).toHaveLength(0);

    await ctx.agent.delete(`${base}/history`).expect(204);
    expect((await ctx.agent.get(`${base}/history`).expect(200)).body).toHaveLength(0);
  });

  it("refuses to confirm another user's draft", async () => {
    const res = await ctx.agent.post(`${base}/message`).send({ text: 'spent 300 on uber' });
    const other = await signUp(app);
    await other.agent.post(`${base}/actions/${res.body.message.id}/confirm`).expect(404);
  });

  it('serves dashboard insights', async () => {
    const res = await ctx.agent.get(`${base}/insights`).expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0]).toEqual(expect.objectContaining({ title: expect.any(String), tone: expect.any(String) }));
  });

  it('validates message length', async () => {
    await ctx.agent.post(`${base}/message`).send({ text: '' }).expect(400);
  });
});

describe('Assistant API: Gemini engine', () => {
  useTestDatabase();

  it('uses Gemini when configured and records the provider', async () => {
    const gemini = { name: 'gemini', respond: vi.fn().mockResolvedValue({ provider: 'gemini', reply: 'From Gemini', toolCalls: ['get_summary'] }) };
    const app = createApp({ assistant: { gemini } });
    const ctx = await signUp(app);

    const status = await ctx.agent.get(`${base}/status`).expect(200);
    expect(status.body).toMatchObject({ provider: 'gemini', geminiConfigured: true });

    const res = await ctx.agent.post(`${base}/message`).send({ text: 'How am I doing?' }).expect(200);
    expect(res.body.message).toMatchObject({ provider: 'gemini', content: 'From Gemini', toolCalls: ['get_summary'] });

    const args = gemini.respond.mock.calls[0][0];
    expect(args.systemInstruction).toMatch(/Kosha Copilot/);
    expect(args.toolDeclarations.map((t) => t.name)).toContain('propose_transaction');
  });

  it('falls back to the offline engine if Gemini fails', async () => {
    const gemini = { name: 'gemini', respond: vi.fn().mockRejectedValue(Object.assign(new Error('quota'), { status: 429 })) };
    const app = createApp({ assistant: { gemini } });
    const ctx = await signUp(app);

    const res = await ctx.agent.post(`${base}/message`).send({ text: 'hello' }).expect(200);
    expect(res.body.message.provider).toBe('offline');
    expect(res.body.message.content.length).toBeGreaterThan(0);
  });
});
