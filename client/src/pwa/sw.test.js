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

  it('leaves other cross-origin requests alone', () => {
    expect(sandbox.strategyFor(req('https://example.com/x.png'))).toBe('network-only');
  });
});
