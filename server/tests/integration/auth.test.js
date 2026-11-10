import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { useTestDatabase } from '../helpers/db.js';
import { signUp } from '../helpers/auth.js';
import { DEFAULT_CATEGORIES } from '@kosha/shared';

const app = createApp();
const base = '/api/v1/auth';

describe('Auth API', () => {
  useTestDatabase();

  describe('POST /register', () => {
    it('creates the account, sets an httpOnly session cookie and hides the hash', async () => {
      const res = await request(app)
        .post(`${base}/register`)
        .send({ name: 'Asha Rao', email: 'Asha@Kosha.test', password: 'secret123' })
        .expect(201);

      expect(res.body.user).toMatchObject({ name: 'Asha Rao', email: 'asha@kosha.test', currency: 'INR' });
      expect(res.body.user.id).toMatch(/^[a-f\d]{24}$/);
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user._id).toBeUndefined();

      const cookie = res.headers['set-cookie'].join(';');
      expect(cookie).toMatch(/kosha_token=/);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
    });

    it('gives every new user the default category catalog', async () => {
      const { agent } = await signUp(app);
      const res = await agent.get('/api/v1/categories').expect(200);
      expect(res.body).toHaveLength(DEFAULT_CATEGORIES.length);
    });

    it('rejects a duplicate email with 409', async () => {
      const body = { name: 'One', email: 'dup@kosha.test', password: 'secret123' };
      await request(app).post(`${base}/register`).send(body).expect(201);
      const res = await request(app).post(`${base}/register`).send(body).expect(409);
      expect(res.body.error.message).toMatch(/already registered/i);
    });

    it('returns field-level validation errors', async () => {
      const res = await request(app)
        .post(`${base}/register`)
        .send({ name: 'A', email: 'bad', password: 'short' })
        .expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const fields = res.body.error.details.map((d) => d.path);
      expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
    });
  });

  describe('POST /login', () => {
    it('logs in with correct credentials', async () => {
      const { credentials } = await signUp(app);
      const res = await request(app)
        .post(`${base}/login`)
        .send({ email: credentials.email, password: credentials.password })
        .expect(200);
      expect(res.body.user.email).toBe(credentials.email);
      expect(res.headers['set-cookie'].join(';')).toMatch(/kosha_token=/);
    });

    it('uses one generic message for wrong password and unknown email', async () => {
      const { credentials } = await signUp(app);
      const wrong = await request(app)
        .post(`${base}/login`)
        .send({ email: credentials.email, password: 'nope12345' })
        .expect(401);
      const unknown = await request(app)
        .post(`${base}/login`)
        .send({ email: 'ghost@kosha.test', password: 'nope12345' })
        .expect(401);
      expect(wrong.body.error.message).toBe(unknown.body.error.message);
    });
  });

  describe('session', () => {
    it('GET /me requires authentication', async () => {
      const res = await request(app).get(`${base}/me`).expect(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('GET /me returns the current user', async () => {
      const { agent, user } = await signUp(app, { name: 'Ravi Kumar' });
      const res = await agent.get(`${base}/me`).expect(200);
      expect(res.body.user).toMatchObject({ id: user.id, name: 'Ravi Kumar' });
    });

    it('accepts a Bearer token as an alternative to the cookie', async () => {
      const { credentials } = await signUp(app);
      const login = await request(app).post(`${base}/login`).send(credentials).expect(200);
      const token = /kosha_token=([^;]+)/.exec(login.headers['set-cookie'].join(';'))[1];
      await request(app).get(`${base}/me`).set('Authorization', `Bearer ${token}`).expect(200);
    });

    it('rejects a tampered token', async () => {
      await request(app).get(`${base}/me`).set('Authorization', 'Bearer abc.def.ghi').expect(401);
    });

    it('POST /logout clears the cookie', async () => {
      const { agent } = await signUp(app);
      const res = await agent.post(`${base}/logout`).expect(204);
      expect(res.headers['set-cookie'].join(';')).toMatch(/kosha_token=;/);
      await agent.get(`${base}/me`).expect(401);
    });
  });

  describe('profile', () => {
    it('PATCH /me updates the display name', async () => {
      const { agent } = await signUp(app);
      const res = await agent.patch(`${base}/me`).send({ name: 'New Name' }).expect(200);
      expect(res.body.user.name).toBe('New Name');
    });

    it('POST /change-password verifies the current password', async () => {
      const { agent, credentials } = await signUp(app);
      await agent
        .post(`${base}/change-password`)
        .send({ currentPassword: 'wrong123', newPassword: 'brandnew123' })
        .expect(400);
      await agent
        .post(`${base}/change-password`)
        .send({ currentPassword: credentials.password, newPassword: 'brandnew123' })
        .expect(204);
      await request(app)
        .post(`${base}/login`)
        .send({ email: credentials.email, password: 'brandnew123' })
        .expect(200);
    });
  });
});
