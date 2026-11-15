/* Kosha service worker: app-shell caching. Money data (/api) is never cached. */
const VERSION = 'kosha-v2';
const MATCH = { ignoreVary: true }; // build assets are served with Vary: Origin; cached copies must still match
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

function strategyFor(request) {
  if (request.method !== 'GET') return 'network-only';
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return FONT_HOSTS.includes(url.hostname) ? 'stale-while-revalidate' : 'network-only';
  }
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
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
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
  else if (strategy === 'cache-first') event.respondWith(cacheFirst(event.request));
  else event.respondWith(staleWhileRevalidate(event.request));
});
