import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { useTestDatabase } from '../helpers/db.js';
import { signUp } from '../helpers/auth.js';

const app = createApp();
const base = '/api/v1/categories';

describe('Categories API', () => {
  useTestDatabase();

  it('requires authentication', async () => {
    await request(app).get(base).expect(401);
  });

  it('filters by type', async () => {
    const { agent } = await signUp(app);
    const res = await agent.get(`${base}?type=income`).expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((c) => c.type === 'income')).toBe(true);
  });

  it('creates a custom category', async () => {
    const { agent } = await signUp(app);
    const res = await agent
      .post(base)
      .send({ name: 'Pets', type: 'expense', color: '#1baf7a', icon: 'paw-print' })
      .expect(201);
    expect(res.body).toMatchObject({ name: 'Pets', type: 'expense', isDefault: false });
  });

  it('rejects a case-insensitive duplicate name with 409', async () => {
    const { agent } = await signUp(app);
    await agent.post(base).send({ name: 'groceries', type: 'expense' }).expect(409);
  });

  it('allows the same name for different users', async () => {
    const a = await signUp(app);
    const b = await signUp(app);
    await a.agent.post(base).send({ name: 'Pets', type: 'expense' }).expect(201);
    await b.agent.post(base).send({ name: 'Pets', type: 'expense' }).expect(201);
  });

  it('renames a category', async () => {
    const { agent, categories } = await signUp(app);
    const res = await agent
      .patch(`${base}/${categories['Dining Out'].id}`)
      .send({ name: 'Eating Out' })
      .expect(200);
    expect(res.body.name).toBe('Eating Out');
  });

  it('refuses to delete a category that still has transactions', async () => {
    const { agent, categories } = await signUp(app);
    await agent
      .post('/api/v1/transactions')
      .send({
        type: 'expense',
        amount: 25000,
        category: categories.Groceries.id,
        description: 'Veggies',
        date: '2026-11-02',
      })
      .expect(201);

    const res = await agent.delete(`${base}/${categories.Groceries.id}`).expect(409);
    expect(res.body.error.message).toMatch(/1 transaction/);
  });

  it('deletes an unused category', async () => {
    const { agent, categories } = await signUp(app);
    await agent.delete(`${base}/${categories.Travel.id}`).expect(204);
    const list = await agent.get(base).expect(200);
    expect(list.body.find((c) => c.name === 'Travel')).toBeUndefined();
  });

  it("returns 404 for another user's category", async () => {
    const a = await signUp(app);
    const b = await signUp(app);
    await b.agent.patch(`${base}/${a.categories.Health.id}`).send({ name: 'Mine now' }).expect(404);
    await b.agent.delete(`${base}/${a.categories.Health.id}`).expect(404);
  });

  it('can include usage counts', async () => {
    const { agent, categories } = await signUp(app);
    await agent.post('/api/v1/transactions').send({
      type: 'expense',
      amount: 9900,
      category: categories.Subscriptions.id,
      description: 'Music',
      date: '2026-11-03',
    });
    const res = await agent.get(`${base}?withUsage=true`).expect(200);
    const subs = res.body.find((c) => c.name === 'Subscriptions');
    expect(subs.transactionCount).toBe(1);
  });
});
