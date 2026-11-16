import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { COOKIE_CONSENT_VERSION } from '@kosha/shared';
import { createApp } from '../../src/app.js';
import { useTestDatabase } from '../helpers/db.js';
import { signUp } from '../helpers/auth.js';

const app = createApp();
const url = '/api/v1/auth/me/cookies';

describe('Cookie choice, kept with the account so it follows you to every device', () => {
  useTestDatabase();

  it('needs you to be signed in', async () => {
    expect((await request(app).put(url).send({ preferences: true })).status).toBe(401);
  });

  it('starts with no choice recorded', async () => {
    const { agent, user } = await signUp(app);
    expect(user.cookieConsent ?? null).toBeNull();
    const me = await agent.get('/api/v1/auth/me').expect(200);
    expect(me.body.user.cookieConsent ?? null).toBeNull();
  });

  it('saves a yes, with the version it was made under, and returns it from /me', async () => {
    const { agent } = await signUp(app);
    const at = new Date(Date.now() - 60_000).toISOString();
    const res = await agent.put(url).send({ preferences: true, decidedAt: at }).expect(200);
    expect(res.body.cookieConsent).toMatchObject({ preferences: true, version: COOKIE_CONSENT_VERSION, decidedAt: at });
    const me = await agent.get('/api/v1/auth/me').expect(200);
    expect(me.body.user.cookieConsent).toMatchObject({ preferences: true, decidedAt: at });
  });

  it('uses the time of the request when the device did not say when it was decided', async () => {
    const { agent } = await signUp(app);
    const before = Date.now();
    const res = await agent.put(url).send({ preferences: false }).expect(200);
    expect(res.body.cookieConsent.preferences).toBe(false);
    expect(new Date(res.body.cookieConsent.decidedAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it('lets a newer choice replace an older one', async () => {
    const { agent } = await signUp(app);
    const older = new Date(Date.now() - 3_600_000).toISOString();
    const newer = new Date(Date.now() - 60_000).toISOString();
    await agent.put(url).send({ preferences: true, decidedAt: older }).expect(200);
    const res = await agent.put(url).send({ preferences: false, decidedAt: newer }).expect(200);
    expect(res.body.cookieConsent).toMatchObject({ preferences: false, decidedAt: newer });
  });

  it('ignores a choice older than the one on record, so a device that was offline cannot undo a newer choice', async () => {
    const { agent } = await signUp(app);
    const older = new Date(Date.now() - 3_600_000).toISOString();
    const newer = new Date(Date.now() - 60_000).toISOString();
    await agent.put(url).send({ preferences: false, decidedAt: newer }).expect(200);
    const res = await agent.put(url).send({ preferences: true, decidedAt: older }).expect(200);
    expect(res.body.cookieConsent).toMatchObject({ preferences: false, decidedAt: newer }); // what is on record comes back
    const me = await agent.get('/api/v1/auth/me').expect(200);
    expect(me.body.user.cookieConsent.preferences).toBe(false);
  });

  it('does not accept a time in the future', async () => {
    const { agent } = await signUp(app);
    const before = Date.now();
    const res = await agent.put(url).send({ preferences: true, decidedAt: new Date(Date.now() + 86_400_000).toISOString() }).expect(200);
    expect(new Date(res.body.cookieConsent.decidedAt).getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    expect(new Date(res.body.cookieConsent.decidedAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it('rejects anything that is not a plain yes or no', async () => {
    const { agent } = await signUp(app);
    for (const body of [{}, { preferences: 'yes' }, { preferences: true, decidedAt: 'soon' }, { preferences: true, analytics: true }]) {
      const res = await agent.put(url).send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
  });

  it('keeps each person\'s choice to themselves', async () => {
    const a = await signUp(app);
    const b = await signUp(app);
    await a.agent.put(url).send({ preferences: true }).expect(200);
    const me = await b.agent.get('/api/v1/auth/me').expect(200);
    expect(me.body.user.cookieConsent ?? null).toBeNull();
  });

  it('is removed with the account', async () => {
    const { agent, credentials } = await signUp(app);
    await agent.put(url).send({ preferences: true }).expect(200);
    await agent.delete('/api/v1/auth/me').send({ password: credentials.password }).expect(204);
    expect((await request(app).post('/api/v1/auth/login').send({ email: credentials.email, password: credentials.password })).status).toBe(401);
  });
});
