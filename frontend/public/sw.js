// Minimal service worker — required for PWA installability.
// Only caches the app shell on install; all network requests pass through.
const CACHE = 'coldtrack-v1';
const SHELL = ['/', '/index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Delete old caches when a new SW version is deployed
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Navigation requests → serve index.html from cache (SPA fallback)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }
  // Everything else → network first, no caching
  e.respondWith(fetch(e.request));
});
