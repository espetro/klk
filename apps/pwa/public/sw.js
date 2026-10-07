// klk app shell service worker.
// - navigations: network-first, offline falls back to the cached shell
// - hashed static assets: cache-first
// - relay/api traffic and non-GET requests: never intercepted
const CACHE = "klk-shell-1";

const NEVER = ["/healthz", "/api/", "/manifest.webmanifest", "/sw.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (NEVER.some((p) => url.pathname.startsWith(p))) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            void caches.open(CACHE).then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(async () => {
          const hit = await caches.match(event.request);
          return hit ?? (await caches.match("/index.html")) ?? Response.error();
        }),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/public/")) {
    event.respondWith(
      caches.match(event.request).then(
        (hit) =>
          hit ??
          fetch(event.request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              void caches.open(CACHE).then((c) => c.put(event.request, copy));
            }
            return res;
          }),
      ),
    );
  }
});
