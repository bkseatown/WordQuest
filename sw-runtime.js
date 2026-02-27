/* WordQuest offline runtime
 * Cache strategy:
 * - App shell (JS/CSS): network-first with cache fallback
 * - Navigation: network-first with cached index fallback
 * - Data files: network-first with cache fallback
 * - Audio files: stale-while-revalidate runtime cache (bounded size)
 */

const SW_VERSION = '20260227-v12';
const SHELL_CACHE = `wq-shell-${SW_VERSION}`;
const DATA_CACHE = `wq-data-${SW_VERSION}`;
const AUDIO_CACHE = `wq-audio-${SW_VERSION}`;
const DYNAMIC_CACHE = `wq-dynamic-${SW_VERSION}`;
const AUDIO_MAX_ENTRIES = 1800;

const CORE_FILES = [
  './',
  './index.html',
  './style/modes.css',
  './style/themes.css',
  './style/components.css',
  './style/world-themes.css',
  './data/words-inline.js',
  './data/audio-manifest.json',
  './data/music-catalog.json',
  './js/data.js',
  './js/audio.js',
  './js/game.js',
  './js/ui.js',
  './js/theme-registry.js',
  './js/theme-nav.js',
  './js/app.js',
  './sw.js',
  './sw-runtime.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const requests = CORE_FILES.map((rel) => new Request(new URL(rel, self.registration.scope).toString(), { cache: 'reload' }));
    await cache.addAll(requests);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const expected = new Set([SHELL_CACHE, DATA_CACHE, AUDIO_CACHE, DYNAMIC_CACHE]);
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith('wq-') && !expected.has(name))
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'WQ_SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isAudioRequest(url) {
  return url.pathname.includes('/assets/audio/')
    || url.pathname.includes('/assets/music/');
}

function isDataRequest(url) {
  return url.pathname.includes('/data/');
}

function isShellCriticalRequest(url) {
  return url.pathname.includes('/style/')
    || url.pathname.includes('/js/')
    || url.pathname.endsWith('/index.html');
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const excess = keys.length - maxEntries;
  await Promise.all(keys.slice(0, excess).map((req) => cache.delete(req)));
}

async function navigationHandler(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const fallback = await cache.match(new URL('./index.html', self.registration.scope).toString(), { ignoreSearch: true });
    if (fallback) return fallback;
    return new Response('Offline and no cached shell available.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

async function cacheFirst(request, primaryCache) {
  const primary = await caches.open(primaryCache);
  const hit = await primary.match(request);
  if (hit) return hit;

  const dynamic = await caches.open(DYNAMIC_CACHE);
  const dynamicHit = await dynamic.match(request);
  if (dynamicHit) return dynamicHit;

  try {
    const network = await fetch(request);
    if (network && network.ok) {
      dynamic.put(request, network.clone()).catch(() => {});
    }
    return network;
  } catch {
    return new Response('Offline and asset not cached yet.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const network = await fetch(request);
    if (network && network.ok) {
      cache.put(request, network.clone()).catch(() => {});
    }
    return network;
  } catch {
    const hit = await cache.match(request);
    if (hit) return hit;
    return new Response('Offline and no cached data available.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

async function staleWhileRevalidateAudio(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });

  const networkPromise = fetch(request)
    .then((network) => {
      if (network && network.ok) {
        cache.put(request, network.clone()).catch(() => {});
        trimCache(AUDIO_CACHE, AUDIO_MAX_ENTRIES).catch(() => {});
      }
      return network;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const network = await networkPromise;
  if (network) return network;

  return new Response('', { status: 504, statusText: 'Offline audio unavailable' });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  if (isAudioRequest(url)) {
    event.respondWith(staleWhileRevalidateAudio(request));
    return;
  }

  if (isDataRequest(url)) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (isShellCriticalRequest(url)) {
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }

  event.respondWith(cacheFirst(request, SHELL_CACHE));
});
