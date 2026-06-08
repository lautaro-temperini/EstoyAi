// Minimal offline-capable service worker for the Halketon PWA.
// App-shell caching only — transcription requests (/api/*) always hit the
// network so the on-device model on the Node backend does the work.

const CACHE = "halketon-shell-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never cache API/transcription calls or non-GET requests.
  if (request.method !== "GET" || new URL(request.url).pathname.startsWith("/api/")) {
    return;
  }

  // Network-first for navigations, falling back to the cached shell offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/").then((r) => r ?? Response.error())),
    );
    return;
  }

  // Cache-first for other GETs (static assets), then update the cache.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        }),
    ),
  );
});
