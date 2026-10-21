// Offline support: app files are cached on install; fonts are cached the first time they load.
const CACHE = "rotation-counter-v1";
const APP = ["./", "index.html", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // The page itself: try the network first so updates arrive, fall back to the cached copy offline.
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put("index.html", copy)); return r; })
        .catch(() => caches.match("index.html"))
    );
    return;
  }
  // Everything else (icons, fonts): cache first.
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
      if (r.ok || r.type === "opaque") {
        if (url.origin === location.origin || url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com")) {
          const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
      }
      return r;
    }))
  );
});
