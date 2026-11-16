import { describe, it, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import { createMarketService } from '../../src/markets/service.js';
import { useTestDatabase } from '../helpers/db.js';
import { signUp } from '../helpers/auth.js';
import { fakeNse, fakeMf, NOW_MONDAY_MORNING, LATEST, FUNDS } from '../helpers/markets.js';

const build = ({ nse = fakeNse(), mf = fakeMf() } = {}) =>
  createApp({ markets: createMarketService({ fetchBuffer: nse.fetchBuffer, fetchJson: mf.fetchJson, now: () => NOW_MONDAY_MORNING }) });
const app = build();
const api = '/api/v1/markets';

describe('Markets API', () => {
  useTestDatabase();

  it('needs a session', async () => {
    for (const path of ['/overview', '/indices/Nifty%2050', '/stocks/search?q=aa', '/stocks/AAA', '/funds/categories', '/funds/top?category=index', '/funds/120716']) {
      await request(app).get(`${api}${path}`).expect(401);
    }
    await request(app).get('/api/v1/watchlist').expect(401);
  });

  it('serves the overview', async () => {
    const { agent } = await signUp(app);
    const res = await agent.get(`${api}/overview`).expect(200);
    expect(res.body.asOf).toBe(LATEST);
    expect(res.body.indices.length).toBeGreaterThanOrEqual(3);
    expect(res.body.gainers[0].symbol).toBe('AAA');
    expect(res.body.breadth.total).toBe(4);
  });

  it('serves an index by name, in any case', async () => {
    const { agent } = await signUp(app);
    expect((await agent.get(`${api}/indices/${encodeURIComponent('nifty bank')}`).expect(200)).body.name).toBe('Nifty Bank');
    await agent.get(`${api}/indices/${encodeURIComponent('Nifty Nonsense')}`).expect(404);
  });

  it('searches stocks, and needs a real query', async () => {
    const { agent } = await signUp(app);
    expect((await agent.get(`${api}/stocks/search?q=aaa`).expect(200)).body.map((s) => s.symbol)).toEqual(['AAA']);
    await agent.get(`${api}/stocks/search`).expect(400);
    await agent.get(`${api}/stocks/search?q=a`).expect(400);
    await agent.get(`${api}/stocks/search?q=${'x'.repeat(41)}`).expect(400);
  });

  it('serves one stock, accepts lower case, and rejects bad symbols', async () => {
    const { agent } = await signUp(app);
    const res = await agent.get(`${api}/stocks/aaa`).expect(200);
    expect(res.body).toMatchObject({ symbol: 'AAA', industry: 'Financial Services' });
    expect(res.body.returns).toHaveLength(5);
    await agent.get(`${api}/stocks/NOPE`).expect(404);
    await agent.get(`${api}/stocks/${encodeURIComponent('A B!')}`).expect(400);
  });

  it('serves fund categories, a ranked category, one scheme and a search', async () => {
    const { agent } = await signUp(app);
    const cats = (await agent.get(`${api}/funds/categories`).expect(200)).body;
    expect(cats.map((c) => c.id)).toContain('index');
    const top = (await agent.get(`${api}/funds/top?category=index`).expect(200)).body;
    expect(top.items.map((f) => f.code)).toEqual([119063, 120716]);
    await agent.get(`${api}/funds/top?category=crypto`).expect(400);
    await agent.get(`${api}/funds/top`).expect(400);
    const one = (await agent.get(`${api}/funds/${FUNDS[0].code}`).expect(200)).body;
    expect(one.name).toBe(FUNDS[0].name);
    await agent.get(`${api}/funds/abc`).expect(400);
    await agent.get(`${api}/funds/555555`).expect(404);
    expect((await agent.get(`${api}/funds/search?q=flexi`).expect(200)).body.map((f) => f.code)).toEqual([122639]);
  });

  it('answers 503 with a clear code, not made-up numbers, when the data sources are unreachable', async () => {
    const down = build({ nse: fakeNse({ fail: true }), mf: fakeMf({ fail: true }) });
    const { agent } = await signUp(down);
    for (const path of ['/overview', '/stocks/AAA', '/indices/Nifty%2050', '/funds/120716', '/funds/top?category=index']) {
      const res = await agent.get(`${api}${path}`).expect(503);
      expect(res.body.error.code).toBe('MARKET_DATA_UNAVAILABLE');
      expect(res.body.error.message).toMatch(/try again/i);
    }
  });

  it('never touches the real network in tests when no fake is supplied', async () => {
    const plain = createApp();
    const { agent } = await signUp(plain);
    const res = await agent.get(`${api}/overview`).expect(503);
    expect(res.body.error.code).toBe('MARKET_DATA_UNAVAILABLE');
  });
});

describe('Watchlist', () => {
  useTestDatabase();
  const url = '/api/v1/watchlist';

  it('starts empty', async () => {
    const { agent } = await signUp(app);
    expect((await agent.get(url).expect(200)).body).toEqual({ items: [] });
  });

  it('adds a stock, an index and a fund, and lists them with the latest figures', async () => {
    const { agent } = await signUp(app);
    const stock = (await agent.post(url).send({ kind: 'stock', ref: 'aaa' }).expect(201)).body;
    expect(stock).toMatchObject({ kind: 'stock', ref: 'AAA', label: 'AAA FINANCE LTD' });
    await agent.post(url).send({ kind: 'index', ref: 'nifty 50' }).expect(201);
    await agent.post(url).send({ kind: 'fund', ref: '120716' }).expect(201);
    const list = (await agent.get(url).expect(200)).body.items;
    expect(list.map((i) => `${i.kind}:${i.ref}`)).toEqual(['stock:AAA', 'index:Nifty 50', 'fund:120716']);
    for (const i of list) expect(i).toMatchObject({ price: expect.any(Number), asOf: expect.any(String), label: expect.any(String), id: expect.stringMatching(/^[a-f\d]{24}$/) });
  });

  it('adding the same thing twice keeps one entry', async () => {
    const { agent } = await signUp(app);
    const first = (await agent.post(url).send({ kind: 'stock', ref: 'AAA' }).expect(201)).body;
    const again = (await agent.post(url).send({ kind: 'stock', ref: 'aaa' }).expect(200)).body;
    expect(again.id).toBe(first.id);
    expect((await agent.get(url).expect(200)).body.items).toHaveLength(1);
  });

  it('refuses things that do not exist, and bad input', async () => {
    const { agent } = await signUp(app);
    await agent.post(url).send({ kind: 'stock', ref: 'NOPE' }).expect(404);
    await agent.post(url).send({ kind: 'fund', ref: '555555' }).expect(404);
    await agent.post(url).send({ kind: 'crypto', ref: 'BTC' }).expect(400);
    await agent.post(url).send({ kind: 'stock' }).expect(400);
    await agent.post(url).send({ kind: 'stock', ref: 'x'.repeat(81) }).expect(400);
  });

  it('removes an entry, only for its owner', async () => {
    const a = await signUp(app);
    const b = await signUp(app);
    const item = (await a.agent.post(url).send({ kind: 'stock', ref: 'AAA' }).expect(201)).body;
    await b.agent.delete(`${url}/${item.id}`).expect(404);
    expect((await b.agent.get(url).expect(200)).body.items).toEqual([]);
    await a.agent.delete(`${url}/${item.id}`).expect(204);
    expect((await a.agent.get(url).expect(200)).body.items).toEqual([]);
    await a.agent.delete(`${url}/${item.id}`).expect(404);
    await a.agent.delete(`${url}/not-an-id`).expect(400);
  });

  it('stops at 50 entries', async () => {
    const { agent, user } = await signUp(app);
    const docs = Array.from({ length: 50 }, (_, i) => ({ user: new mongoose.Types.ObjectId(user.id), kind: 'stock', ref: `S${i}`, label: `S${i}` }));
    await mongoose.connection.db.collection('watchlistitems').insertMany(docs);
    const res = await agent.post(url).send({ kind: 'stock', ref: 'AAA' }).expect(409);
    expect(res.body.error.message).toMatch(/50/);
  });

  it('still lists an entry, without a price, when the data source is down', async () => {
    const { agent } = await signUp(app);
    await agent.post(url).send({ kind: 'stock', ref: 'AAA' }).expect(201);
    const down = build({ nse: fakeNse({ fail: true }) });
    const again = request.agent(down);
    // Same user, different app instance: sign in again against the shared test database.
    const email = (await agent.get('/api/v1/auth/me').expect(200)).body.user?.email ?? (await agent.get('/api/v1/auth/me')).body.email;
    await again.post('/api/v1/auth/login').send({ email, password: 'testpass123' }).expect(200);
    const list = (await again.get(url).expect(200)).body.items;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ ref: 'AAA', label: 'AAA FINANCE LTD', price: null, changePct: null });
  });

  it('is deleted along with the account', async () => {
    const { agent, credentials } = await signUp(app);
    await agent.post(url).send({ kind: 'stock', ref: 'AAA' }).expect(201);
    await agent.delete('/api/v1/auth/me').send({ password: credentials.password }).expect(204);
    expect(await mongoose.connection.db.collection('watchlistitems').countDocuments()).toBe(0);
  });
});
