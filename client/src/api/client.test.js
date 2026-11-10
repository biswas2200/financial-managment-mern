import { describe, it, expect, vi, afterEach } from 'vitest';
import { api, ApiError } from './client.js';

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('api client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends JSON with credentials and returns parsed data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const data = await api('/transactions', { method: 'POST', body: { amount: 100 } });

    expect(data).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/v1\/transactions$/);
    expect(init).toMatchObject({ method: 'POST', credentials: 'include', body: '{"amount":100}' });
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('builds query strings and drops empty values', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal('fetch', fetchMock);

    await api('/transactions', { query: { type: 'expense', q: '', category: undefined, page: 2 } });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(Object.fromEntries(url.searchParams)).toEqual({ type: 'expense', page: '2' });
  });

  it('throws ApiError carrying the server message and field details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(400, {
          error: { code: 'VALIDATION_ERROR', message: 'Please check the highlighted fields', details: [{ path: 'amount', message: 'Too big' }] },
        }),
      ),
    );

    const err = await api('/transactions').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', message: 'Please check the highlighted fields' });
    expect(err.fieldErrors).toEqual({ amount: 'Too big' });
  });

  it('returns null for 204 No Content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    expect(await api('/transactions/1', { method: 'DELETE' })).toBeNull();
  });

  it('turns network failures into a friendly ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const err = await api('/x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.message).toMatch(/can't reach/i);
  });
});
