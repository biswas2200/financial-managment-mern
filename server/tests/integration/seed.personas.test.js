import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { useTestDatabase } from '../helpers/db.js';
import { signUp } from '../helpers/auth.js';
import { seedPersonas } from '../../src/seed/persona-seeder.js';
import { PERSONAS, PERSONA_PASSWORD } from '../../src/seed/personas.js';
import { User } from '../../src/models/User.js';
import { Transaction } from '../../src/models/Transaction.js';
import { Budget } from '../../src/models/Budget.js';
import { Category } from '../../src/models/Category.js';
import { WatchlistItem } from '../../src/models/WatchlistItem.js';

const app = createApp();
const NOW = new Date('2026-11-10T15:00:00+05:30');

async function loginAs(persona) {
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/login').send({ email: persona.email, password: PERSONA_PASSWORD }).expect(200);
  return agent;
}

describe('seedPersonas', () => {
  useTestDatabase();
  let result;
  beforeEach(async () => {
    result = await seedPersonas({ now: NOW });
  });

  it('creates every account, and says how many', async () => {
    expect(result).toMatchObject({ created: PERSONAS.length, skipped: 0 });
    expect(await User.countDocuments()).toBe(PERSONAS.length);
  });

  it('lets each person sign in with the shared local demo password, and shows their name, birthday and picture', async () => {
    for (const p of PERSONAS) {
      const agent = await loginAs(p);
      const me = (await agent.get('/api/v1/auth/me').expect(200)).body.user;
      expect(me).toMatchObject({ name: p.name, email: p.email, dateOfBirth: p.dateOfBirth });
      expect(me.avatar).toMatchObject({ type: 'preset', preset: p.avatar.preset });
      expect(me.consent.termsVersion).toBeTruthy(); // they have accepted the Terms, so they land on the app
    }
  });

  it('gives each a history to look at, their own categories, and budgets', async () => {
    for (const p of PERSONAS) {
      const user = await User.findOne({ email: p.email });
      expect(await Transaction.countDocuments({ user: user._id }), p.key).toBeGreaterThan(p.months * 14);
      expect(await Budget.countDocuments({ user: user._id }), p.key).toBeGreaterThanOrEqual(16);
      for (const c of p.extraCategories ?? []) expect(await Category.countDocuments({ user: user._id, name: c.name, type: c.type }), `${p.key}: ${c.name}`).toBe(1);
      expect(await Category.countDocuments({ user: user._id, isDefault: true })).toBeGreaterThan(10);
    }
  });

  it('shows real numbers on their overview for last month: money in, money out, and a balance that makes sense', async () => {
    for (const p of PERSONAS) {
      const agent = await loginAs(p);
      const summary = (await agent.get('/api/v1/analytics/summary?month=2026-10').expect(200)).body;
      expect(summary.income, p.key).toBeGreaterThan(0);
      expect(summary.expense, p.key).toBeGreaterThan(0);
      const balance = (await agent.get('/api/v1/balance').expect(200)).body;
      expect(balance.balance, `${p.key} balance`).toBeGreaterThan(0);
    }
  });

  it('starts people with the money they say they already had', async () => {
    for (const p of PERSONAS) expect((await User.findOne({ email: p.email })).openingBalance).toBe(p.openingBalance * 100);
  });

  it('gives the investors something on their watchlist', async () => {
    const rohit = await User.findOne({ email: PERSONAS.find((p) => p.key === 'rohit').email });
    const items = await WatchlistItem.find({ user: rohit._id });
    expect(items.length).toBeGreaterThanOrEqual(4);
    for (const i of items) expect(i.label.length).toBeGreaterThan(2);
  });

  it('is safe to run again: nothing is doubled', async () => {
    const before = await Transaction.countDocuments();
    const again = await seedPersonas({ now: NOW });
    expect(again).toMatchObject({ created: 0, skipped: PERSONAS.length });
    expect(await Transaction.countDocuments()).toBe(before);
    expect(await User.countDocuments()).toBe(PERSONAS.length);
  });

  it('can rebuild just these accounts, without touching anybody else', async () => {
    const { agent } = await signUp(app, { name: 'Real Person' });
    await agent.post('/api/v1/transactions').send({ type: 'expense', amount: 100, category: (await agent.get('/api/v1/categories')).body[0].id, date: new Date().toISOString() });
    const mine = await Transaction.countDocuments({ description: { $ne: null } });
    const kabir = await User.findOne({ email: PERSONAS[0].email });
    await Transaction.deleteMany({ user: kabir._id }); // damage one of them
    const refreshed = await seedPersonas({ now: NOW, refresh: true });
    expect(refreshed).toMatchObject({ created: PERSONAS.length, skipped: 0 });
    expect(await User.countDocuments()).toBe(PERSONAS.length + 1);
    expect(await Transaction.countDocuments({ user: (await User.findOne({ email: PERSONAS[0].email }))._id })).toBeGreaterThan(100);
    expect((await agent.get('/api/v1/transactions?limit=5')).body.total).toBeGreaterThanOrEqual(1);
    expect(mine).toBeGreaterThan(0);
  });
});
