import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { POLICY_VERSION } from '@kosha/shared';
import { createApp } from '../../src/app.js';
import { useTestDatabase } from '../helpers/db.js';
import { signUp } from '../helpers/auth.js';

const app = createApp();
const base = '/api/v1/auth';
const account = (extra = {}) => ({ name: 'Asha Rao', email: `asha-${Date.now()}-${Math.random()}@kosha.test`, password: 'secret123', acceptedTerms: true, ...extra });

describe('Profile, consent and contact details', () => {
  useTestDatabase();

  describe('sign-up consent', () => {
    it('refuses to create an account until the Terms and Privacy Policy are accepted', async () => {
      const res = await request(app).post(`${base}/register`).send(account({ acceptedTerms: false })).expect(400);
      expect(res.body.error.details.map((d) => d.path)).toContain('acceptedTerms');
    });

    it('records which policy version was accepted, and when', async () => {
      const before = Date.now();
      const res = await request(app).post(`${base}/register`).send(account()).expect(201);
      expect(res.body.user.consent.termsVersion).toBe(POLICY_VERSION);
      expect(new Date(res.body.user.consent.acceptedAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
    });

    it('stores an optional phone number in E.164 form and an optional date of birth', async () => {
      const res = await request(app)
        .post(`${base}/register`)
        .send(account({ phone: '98765 43210', dateOfBirth: '1999-04-02' }))
        .expect(201);
      expect(res.body.user).toMatchObject({ phone: '+919876543210', dateOfBirth: '1999-04-02' });
    });

    it('rejects someone under the minimum age', async () => {
      const young = new Date();
      young.setFullYear(young.getFullYear() - 10);
      const res = await request(app).post(`${base}/register`).send(account({ dateOfBirth: young.toISOString().slice(0, 10) })).expect(400);
      expect(res.body.error.details.map((d) => d.path)).toContain('dateOfBirth');
    });
  });

  describe('PATCH /me', () => {
    it('updates phone, date of birth and an icon avatar, and returns them from /me', async () => {
      const { agent } = await signUp(app);
      const avatar = { type: 'preset', preset: 'rocket', color: '#eb6834' };
      const res = await agent.patch(`${base}/me`).send({ name: 'Asha R', phone: '9123456780', dateOfBirth: '2001-01-09', avatar }).expect(200);
      expect(res.body.user).toMatchObject({ name: 'Asha R', phone: '+919123456780', dateOfBirth: '2001-01-09', avatar });
      const me = await agent.get(`${base}/me`).expect(200);
      expect(me.body.user.avatar).toEqual(avatar);
    });

    it('stores an uploaded photo as a small data URL', async () => {
      const { agent } = await signUp(app);
      const image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';
      const res = await agent.patch(`${base}/me`).send({ name: 'Asha R', avatar: { type: 'image', image } }).expect(200);
      expect(res.body.user.avatar).toEqual({ type: 'image', image });
    });

    it('clears phone, date of birth and avatar when they are sent as empty', async () => {
      const { agent } = await signUp(app, { phone: '9123456780', dateOfBirth: '2001-01-09' });
      await agent.patch(`${base}/me`).send({ name: 'Asha', avatar: { type: 'preset', preset: 'leaf', color: '#1baf7a' } }).expect(200);
      const res = await agent.patch(`${base}/me`).send({ name: 'Asha', phone: '', dateOfBirth: null, avatar: null }).expect(200);
      expect(res.body.user.phone).toBeUndefined();
      expect(res.body.user.dateOfBirth).toBeUndefined();
      expect(res.body.user.avatar).toBeUndefined();
    });

    it('refuses an avatar that is not an image', async () => {
      const { agent } = await signUp(app);
      await agent.patch(`${base}/me`).send({ name: 'Asha', avatar: { type: 'image', image: 'javascript:alert(1)' } }).expect(400);
      await agent.patch(`${base}/me`).send({ name: 'Asha', avatar: { type: 'preset', preset: 'nope', color: '#2a78d6' } }).expect(400);
    });

    it('never lets the consent record or the opening balance be edited through the profile', async () => {
      const { agent, user } = await signUp(app);
      const res = await agent.patch(`${base}/me`).send({ name: 'Asha', consent: { termsVersion: 'x' }, openingBalance: 999999 }).expect(200);
      expect(res.body.user.consent.termsVersion).toBe(user.consent.termsVersion);
      expect(res.body.user.openingBalance ?? 0).toBe(0);
    });
  });

  describe('DELETE /me (delete the account)', () => {
    it('needs the right password, and removes the account with everything in it', async () => {
      const ctx = await signUp(app);
      await ctx.agent
        .post('/api/v1/transactions')
        .send({ type: 'expense', amount: 5000, category: ctx.categories.Groceries.id, description: 'Milk', date: '2026-11-02' })
        .expect(201);
      await ctx.agent.post('/api/v1/budgets').send({}).catch(() => {});

      await ctx.agent.delete(`${base}/me`).send({ password: 'wrong-pass1' }).expect(400);
      await ctx.agent.get(`${base}/me`).expect(200); // still signed in, still there

      await ctx.agent.delete(`${base}/me`).send({ password: ctx.credentials.password }).expect(204);
      await ctx.agent.get(`${base}/me`).expect(401);
      await request(app).post(`${base}/login`).send({ email: ctx.credentials.email, password: ctx.credentials.password }).expect(401);

      const { Transaction } = await import('../../src/models/Transaction.js');
      const { Category } = await import('../../src/models/Category.js');
      const { User } = await import('../../src/models/User.js');
      expect(await Transaction.countDocuments({ user: ctx.user.id })).toBe(0);
      expect(await Category.countDocuments({ user: ctx.user.id })).toBe(0);
      expect(await User.countDocuments({ _id: ctx.user.id })).toBe(0);
    });

    it('leaves other people untouched', async () => {
      const a = await signUp(app);
      const b = await signUp(app);
      await a.agent.delete(`${base}/me`).send({ password: a.credentials.password }).expect(204);
      await b.agent.get(`${base}/me`).expect(200);
      expect((await b.agent.get('/api/v1/categories')).body.length).toBeGreaterThan(0);
    });

    it('asks for the password', async () => {
      const { agent } = await signUp(app);
      await agent.delete(`${base}/me`).send({}).expect(400);
    });
  });
});
