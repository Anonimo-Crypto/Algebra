const VERSION = "2.4.0";
const CACHE = `algebra-core-${VERSION}`;
const META_CACHE = "algebra-update-meta";
const ACTIVE_KEY = new Request(new URL("./__active_update__", self.location).href);
const CORE = [
  "./","./index.html","./css/style.css","./js/frac.js","./js/parser.js","./js/markdown.js",
  "./js/types.js","./js/solver.js","./js/app.js","./manifest.json","./version.json",
  "./update-manifest.json","./offline-manifest.json","./README.md","./icons/icon-192.png"
];

self.addEventListener("install", event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())
));

self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

async function activeUpdateCache() {
  const meta = await caches.open(META_CACHE);
  const response = await meta.match(ACTIVE_KEY);
  if (!response) return null;
  try {
    const data = await response.json();
    return data?.cache || null;
  } catch (_) { return null; }
}

async function matchActiveUpdate(request) {
  const name = await activeUpdateCache();
  if (!name) return null;
  const cache = await caches.open(name);
  return cache.match(request);
}

self.addEventListener("message", event => {
  const data = event.data || {};
  if (data.type !== "ACTIVATE_DOWNLOADED_UPDATE" || !data.cache) return;
  event.waitUntil?.((async () => {
    const cache = await caches.open(data.cache);
    const index = await cache.match(new URL("./index.html", self.location).href);
    if (!index) throw new Error("La actualización descargada está incompleta.");
    const meta = await caches.open(META_CACHE);
    await meta.put(ACTIVE_KEY, new Response(JSON.stringify({ version: data.version, cache: data.cache }), {
      headers: { "content-type": "application/json" }
    }));
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach(client => client.postMessage({ type: "UPDATE_APPLIED", version: data.version }));
  })());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (url.pathname.endsWith("/version.json") || url.pathname.endsWith("/update-manifest.json") || url.pathname.endsWith("/offline-manifest.json")) {
    event.respondWith(fetch(event.request, { cache: "no-store" }).then(async response => {
      const copy = response.clone();
      const core = await caches.open(CACHE); await core.put(event.request, copy);
      return response;
    }).catch(async () => (await matchActiveUpdate(event.request)) || caches.match(event.request)));
    return;
  }

  event.respondWith((async () => {
    const staged = await matchActiveUpdate(event.request);
    if (staged) return staged;
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      const copy = response.clone();
      const core = await caches.open(CACHE); core.put(event.request, copy);
      return response;
    } catch (_) {
      return (await matchActiveUpdate(new Request(new URL("./index.html", self.location).href))) ||
        (await caches.match("./index.html"));
    }
  })());
});
