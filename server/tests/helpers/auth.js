import request from 'supertest';

let counter = 0;

/**
 * Registers a fresh user and returns a supertest agent that carries the auth cookie,
 * plus the user's default categories keyed by name.
 */
export async function signUp(app, overrides = {}) {
  counter += 1;
  const credentials = {
    name: 'Test User',
    email: `user${counter}-${Date.now()}@kosha.test`,
    password: 'testpass123',
    ...overrides,
  };
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/register').send(credentials).expect(201);

  const cats = await agent.get('/api/v1/categories').expect(200);
  const categories = Object.fromEntries(cats.body.map((c) => [c.name, c]));

  return { agent, user: res.body.user, credentials, categories };
}
