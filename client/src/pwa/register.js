/** Registers the service worker in production builds only (dev keeps Vite HMR uncached). */
export async function registerServiceWorker({
  nav = typeof navigator !== 'undefined' ? navigator : {},
  isProd = import.meta.env.PROD,
} = {}) {
  if (!isProd || !nav.serviceWorker) return false;
  try {
    await nav.serviceWorker.register('/sw.js', { scope: '/' });
    return true;
  } catch {
    return false;
  }
}
