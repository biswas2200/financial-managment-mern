/**
 * Thin fetch wrapper for the Kosha API.
 * - Same-origin requests (Vite proxies /api), session travels as an httpOnly cookie.
 * - Errors become ApiError with the server's message and per-field details.
 */

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details ?? [];
    /** { fieldName: message } for easy form binding */
    this.fieldErrors = Object.fromEntries(this.details.map((d) => [d.path, d.message]));
  }
}

const BASE = '/api/v1';

function buildUrl(path, query) {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

export async function api(path, { method = 'GET', body, query, signal } = {}) {
  let res;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', "Can't reach the Kosha server. Check that the API is running.");
  }

  if (res.status === 204) return null;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const error = isJson ? data?.error : null;
    throw new ApiError(
      res.status,
      error?.code ?? 'HTTP_ERROR',
      error?.message ?? `Request failed (${res.status})`,
      error?.details,
    );
  }
  return data;
}

/** URL for a file download (CSV export) with the same query rules. */
export function downloadUrl(path, query) {
  return buildUrl(path, query).toString();
}
