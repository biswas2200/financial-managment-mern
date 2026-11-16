/* Kosha service worker: app-shell caching. Personal data (/api) is never cached. The one exception is public,
   dated market data (/api/v1/markets), kept so the last end-of-day figures can still be read offline. */
const VERSION = 'kosha-v3';
const DATA_CACHE = `${VERSION}-markets`;
const MAX_DATA_ENTRIES = 60;
const MATCH = { ignoreVary: true }; // build assets are served with Vary: Origin; cached copies must still match
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

function strategyFor(request) {
  if (request.method !== 'GET') return 'network-only';
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return FONT_HOSTS.includes(url.hostname) ? 'stale-while-revalidate' : 'network-only';
  }
  // Public, dated market figures only. Searches are what a person typed, so they are never kept.
  if (url.pathname.startsWith('/api/v1/markets/') && !url.pathname.includes('/search')) return 'network-first-data';
  if (url.pathname.startsWith('/api/')) return 'network-only';
  if (request.mode === 'navigate') return 'network-first';
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) return 'cache-first';
  return 'stale-while-revalidate';
}

// The build's hashed scripts and styles are listed in index.html; cache them with the shell
// so the app opens offline even on the very first reload.
async function precache() {
  const cache = await caches.open(VERSION);
  await cache.addAll(SHELL);
  const html = await (await cache.match('/')).text();
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  await cache.addAll([...new Set(assets)]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== DATA_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put('/', response.clone()); // the SPA shell serves every route
    return response;
  } catch {
    return (await cache.match('/')) ?? Response.error();
  }
}

/** Public market data: always try the network, remember the last good answer, and fall back to it when offline. */
async function networkFirstData(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      await trim(cache);
    }
    return response;
  } catch {
    return (await cache.match(request)) ?? Response.error();
  }
}

/** Keeps the market cache small: forgets the oldest copies beyond the limit. */
async function trim(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_DATA_ENTRIES))) await cache.delete(key);
}

async function cacheFirst(request) {
  const cached = await caches.match(request, MATCH);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(VERSION)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request, MATCH);
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached ?? Response.error());
  return cached ?? fresh;
}

self.addEventListener('fetch', (event) => {
  const strategy = strategyFor(event.request);
  if (strategy === 'network-only') return;
  if (strategy === 'network-first') event.respondWith(networkFirst(event.request));
  else if (strategy === 'network-first-data') event.respondWith(networkFirstData(event.request));
  else if (strategy === 'cache-first') event.respondWith(cacheFirst(event.request));
  else event.respondWith(staleWhileRevalidate(event.request));
});
