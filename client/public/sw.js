// SpendWise service worker
//
// Scope: this exists primarily so SpendWise meets the technical
// installability requirement (a registered service worker with a fetch
// handler). It does a light network-first cache of the app shell so a
// repeat visit loads a little faster and a brief network hiccup doesn't
// show a blank page — it is NOT a full offline mode. All of SpendWise's
// actual data lives in localStorage on the device already, independent of
// this cache.

const CACHE_NAME = "spendwise-shell-v1";
const APP_SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Network-first for navigations, so a deployed update is picked up
  // immediately rather than serving a stale shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/"))
    );
    return;
  }

  // Cache-first for same-origin static assets (icons, built JS/CSS chunks).
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        return res;
      }).catch(() => cached))
    );
  }
});