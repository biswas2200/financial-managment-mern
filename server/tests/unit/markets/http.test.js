import { describe, it, expect, vi, afterEach } from 'vitest';
import { httpBuffer, httpJson } from '../../../src/markets/http.js';

const respond = (status, body = '{}') => vi.fn(async () => ({ status, ok: status >= 200 && status < 300, arrayBuffer: async () => new TextEncoder().encode(body).buffer, json: async () => JSON.parse(body) }));
afterEach(() => vi.unstubAllGlobals());

describe('the real downloaders', () => {
  it('treat "no such file" (404) as missing, not as a failure', async () => {
    vi.stubGlobal('fetch', respond(404));
    expect(await httpBuffer('https://example.test/a')).toBeNull();
    expect(await httpJson('https://example.test/a')).toBeNull();
  });

  it('treat a rejected request (400, 422) as missing too, so a nonsense scheme code is "not found" and not an outage', async () => {
    for (const status of [400, 422]) {
      vi.stubGlobal('fetch', respond(status));
      expect(await httpJson('https://example.test/a'), String(status)).toBeNull();
    }
  });

  it('throw for blocking, rate limits and server errors, which are genuine outages', async () => {
    for (const status of [403, 429, 500, 503]) {
      vi.stubGlobal('fetch', respond(status));
      await expect(httpBuffer('https://example.test/a'), String(status)).rejects.toMatchObject({ status });
    }
  });

  it('return the body when all is well', async () => {
    vi.stubGlobal('fetch', respond(200, '{"a":1}'));
    expect(await httpJson('https://example.test/a')).toEqual({ a: 1 });
    expect((await httpBuffer('https://example.test/a')).toString()).toBe('{"a":1}');
  });

  it('identify themselves honestly and never send credentials', async () => {
    const fetchMock = respond(200);
    vi.stubGlobal('fetch', fetchMock);
    await httpBuffer('https://example.test/a');
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['User-Agent']).toMatch(/Kosha/);
    expect(init.credentials).toBeUndefined();
    expect(Object.keys(init.headers).map((h) => h.toLowerCase())).not.toContain('cookie');
  });
});
