import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

let sandbox;
beforeAll(() => {
  const code = readFileSync(path.resolve(__dirname, '../../public/sw.js'), 'utf8');
  const listeners = {};
  sandbox = {
    listeners,
    self: { addEventListener: (type, fn) => (listeners[type] = fn), location: { origin: 'http://localhost:5173' } },
    caches: {},
    fetch: () => {},
    URL,
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
});

const req = (url, mode = 'no-cors', method = 'GET') => ({ url, mode, method });

describe('service worker', () => {
  it('listens for install, activate and fetch', () => {
    expect(Object.keys(sandbox.listeners).sort()).toEqual(['activate', 'fetch', 'install']);
  });

  it('never caches the API, so balances are always live', () => {
    expect(sandbox.strategyFor(req('http://localhost:5173/api/v1/analytics/summary'))).toBe('network-only');
  });

  it('never touches writes', () => {
    expect(sandbox.strategyFor(req('http://localhost:5173/', 'navigate', 'POST'))).toBe('network-only');
  });

  it('serves pages network-first with the cached shell as the offline fallback', () => {
    expect(sandbox.strategyFor(req('http://localhost:5173/transactions', 'navigate'))).toBe('network-first');
  });

  it('serves hashed build assets cache-first', () => {
    expect(sandbox.strategyFor(req('http://localhost:5173/assets/index-abc123.js'))).toBe('cache-first');
  });

  it('keeps Google Fonts fresh in the background', () => {
    expect(sandbox.strategyFor(req('https://fonts.gstatic.com/s/aneklatin/v1.woff2'))).toBe('stale-while-revalidate');
  });

  it('keeps the last market figures for offline use, since they are public and dated', () => {
    expect(sandbox.strategyFor(req('http://localhost:5173/api/v1/markets/overview'))).toBe('network-first-data');
    expect(sandbox.strategyFor(req('http://localhost:5173/api/v1/markets/funds/120716'))).toBe('network-first-data');
    expect(sandbox.strategyFor(req('http://localhost:5173/api/v1/markets/overview', 'cors', 'POST'))).toBe('network-only');
  });

  it('does not store what people search for', () => {
    expect(sandbox.strategyFor(req('http://localhost:5173/api/v1/markets/stocks/search?q=secret'))).toBe('network-only');
    expect(sandbox.strategyFor(req('http://localhost:5173/api/v1/markets/funds/search?q=secret'))).toBe('network-only');
  });

  it('never stores anything personal: money, watchlist, Copilot, community, learn reactions and profile', () => {
    for (const path of ['transactions', 'budgets', 'balance', 'watchlist', 'assistant/history', 'community/posts', 'learn/articles', 'auth/me']) {
      expect(sandbox.strategyFor(req(`http://localhost:5173/api/v1/${path}`)), path).toBe('network-only');
    }
  });

  it('leaves other cross-origin requests alone', () => {
    expect(sandbox.strategyFor(req('https://example.com/x.png'))).toBe('network-only');
  });
});

describe('service worker caches', () => {
  const store = new Map();
  const fakeCache = {
    put: async (request, response) => store.set(request.url ?? request, response),
    match: async (request) => store.get(request.url ?? request),
  };

  it('serves fresh market data when online, and the last copy when the network fails', async () => {
    sandbox.caches = { open: async () => fakeCache };
    const request = req('http://localhost:5173/api/v1/markets/overview');
    const fresh = { ok: true, clone: () => fresh, body: 'fresh' };
    sandbox.fetch = async () => fresh;
    expect(await sandbox.networkFirstData(request)).toBe(fresh);

    sandbox.fetch = async () => {
      throw new Error('offline');
    };
    expect(await sandbox.networkFirstData(request)).toBe(fresh);
  });

  it('does not keep a failed market response, and reports an error when nothing was saved', async () => {
    store.clear();
    sandbox.caches = { open: async () => fakeCache };
    sandbox.Response = { error: () => 'network error' };
    const request = req('http://localhost:5173/api/v1/markets/stocks/TCS');
    sandbox.fetch = async () => ({ ok: false, status: 503, clone: () => ({}) });
    const res = await sandbox.networkFirstData(request);
    expect(res.status).toBe(503);
    expect(store.size).toBe(0);
    sandbox.fetch = async () => {
      throw new Error('offline');
    };
    expect(await sandbox.networkFirstData(request)).toBe('network error');
  });

  it('keeps the market cache small by forgetting the oldest copies', async () => {
    const entries = Array.from({ length: 70 }, (_, i) => ({ url: `http://localhost:5173/api/v1/markets/stocks/S${i}` }));
    const deleted = [];
    const cache = {
      put: async () => {},
      match: async () => undefined,
      keys: async () => entries,
      delete: async (request) => deleted.push(request.url),
    };
    sandbox.caches = { open: async () => cache };
    sandbox.fetch = async () => ({ ok: true, clone: () => ({}) });
    await sandbox.networkFirstData(req('http://localhost:5173/api/v1/markets/stocks/S70'));
    expect(deleted.length).toBe(10);
    expect(deleted[0]).toBe('http://localhost:5173/api/v1/markets/stocks/S0');
  });

  it('removes the caches of older versions when a new worker takes over', async () => {
    const deleted = [];
    sandbox.caches = { keys: async () => ['kosha-v2', 'kosha-v3', 'kosha-v3-markets', 'unrelated'], delete: async (k) => deleted.push(k) };
    sandbox.self.clients = { claim: async () => {} };
    let pending;
    sandbox.listeners.activate({ waitUntil: (p) => (pending = p) });
    await pending;
    expect(deleted.sort()).toEqual(['kosha-v2', 'unrelated']);
  });
});
