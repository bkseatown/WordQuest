/* WordQuest offline runtime
 * Cache strategy:
 * - App shell (JS/CSS): network-first with cache fallback
 * - Navigation: network-first with cached index fallback
 * - Data files: network-first with cache fallback
 * - Audio files: stale-while-revalidate runtime cache (bounded size)
 */

const SW_VERSION = '20260301-v1';
const SHELL_CACHE = `wq-shell-${SW_VERSION}`;
const DATA_CACHE = `wq-data-${SW_VERSION}`;
const AUDIO_CACHE = `wq-audio-${SW_VERSION}`;
const DYNAMIC_CACHE = `wq-dynamic-${SW_VERSION}`;
const AUDIO_MAX_ENTRIES = 1800;

const CORE_FILES = [
  './',
  './index.html',
  './sw.js',
  './sw-runtime.js'
];
const VERSION_URL = new URL('./version.json', self.registration.scope).toString();
const VERSION_META_CACHE = 'wq-version-meta';
let runtimeCacheSuffix = SW_VERSION;

async function readVersionPayload() {
  try {
    const response = await fetch(VERSION_URL, { cache: 'no-store' });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function computeVersionSuffix(payload) {
  const raw = String((payload && (payload.cacheBuster || payload.sha || payload.v)) || '').trim();
  return raw ? raw.slice(0, 16) : SW_VERSION;
}

async function persistVersionSuffix(nextSuffix) {
  const cache = await caches.open(VERSION_META_CACHE);
  await cache.put(
    'wq-version-suffix',
    new Response(JSON.stringify({ suffix: nextSuffix }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  );
}

async function getStoredSuffix() {
  try {
    const cache = await caches.open(VERSION_META_CACHE);
    const response = await cache.match('wq-version-suffix');
    if (!response) return '';
    const json = await response.json();
    return String(json && json.suffix || '').trim();
  } catch {
    return '';
  }
}

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
    const versionPayload = await readVersionPayload();
    const nextSuffix = computeVersionSuffix(versionPayload);
    const prevSuffix = await getStoredSuffix();
    runtimeCacheSuffix = nextSuffix;
    const expected = new Set([SHELL_CACHE, DATA_CACHE, AUDIO_CACHE, DYNAMIC_CACHE]);
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith('wq-') && !expected.has(name))
        .map((name) => caches.delete(name))
    );

    if (prevSuffix && prevSuffix !== nextSuffix) {
      const allNames = await caches.keys();
      await Promise.all(
        allNames
          .filter((name) => name.startsWith('wq-') && name !== VERSION_META_CACHE)
        .map((name) => caches.delete(name))
      );
    }

    await persistVersionSuffix(nextSuffix);
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    clients.forEach((client) => {
      client.postMessage({ type: 'WQ_RUNTIME_UPDATING', version: runtimeCacheSuffix });
    });
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
    // Never mask an upstream 404 with a cached shell; return network response as-is.
    if (response && response.status === 404) return response;
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

async function networkFirst(request, cacheName, options = {}) {
  const ignoreSearchFallback = options.ignoreSearchFallback === true;
  const cache = await caches.open(cacheName);
  try {
    const network = await fetch(request);
    if (network && network.ok) {
      cache.put(request, network.clone()).catch(() => {});
    }
    return network;
  } catch {
    let hit = await cache.match(request);
    if (!hit && ignoreSearchFallback) {
      hit = await cache.match(request, { ignoreSearch: true });
    }
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
    event.respondWith(networkFirst(request, SHELL_CACHE, { ignoreSearchFallback: true }));
    return;
  }

  event.respondWith(cacheFirst(request, SHELL_CACHE));
});
