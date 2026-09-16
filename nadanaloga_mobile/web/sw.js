// Minimal service worker for Nadanaloga.
//
// Its ONLY purpose is to make the app installable in Chrome/Edge/Android, which
// require a service worker with a fetch handler before firing `beforeinstallprompt`.
//
// It deliberately does NOT cache anything: every request goes straight to the
// network, so it can never serve a stale build (the earlier blank-screen bug was
// caused by Flutter's default offline-caching worker). On activation it also
// deletes any caches left behind by a previous service worker.

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    (async function () {
      try {
        var keys = await caches.keys();
        await Promise.all(keys.map(function (k) { return caches.delete(k); }));
      } catch (e) { /* ignore */ }
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', function (event) {
  // Network passthrough — always fresh, no offline caching.
  event.respondWith(fetch(event.request));
});
