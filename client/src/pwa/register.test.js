import { describe, it, expect, vi } from 'vitest';
import { registerServiceWorker } from './register.js';

describe('registerServiceWorker', () => {
  it('does nothing in development, so Vite hot reload is never cached', async () => {
    const register = vi.fn();
    const ok = await registerServiceWorker({ nav: { serviceWorker: { register } }, isProd: false });
    expect(ok).toBe(false);
    expect(register).not.toHaveBeenCalled();
  });

  it('does nothing in browsers without service workers', async () => {
    expect(await registerServiceWorker({ nav: {}, isProd: true })).toBe(false);
  });

  it('registers /sw.js for the whole app in production', async () => {
    const register = vi.fn().mockResolvedValue({});
    const ok = await registerServiceWorker({ nav: { serviceWorker: { register } }, isProd: true });
    expect(ok).toBe(true);
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('reports failure instead of throwing', async () => {
    const register = vi.fn().mockRejectedValue(new Error('blocked'));
    expect(await registerServiceWorker({ nav: { serviceWorker: { register } }, isProd: true })).toBe(false);
  });
});
