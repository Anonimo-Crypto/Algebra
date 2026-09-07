const VERSION = "2.1.2";
const CACHE = `algebra-core-${VERSION}`;
const CORE = ["./","./index.html","./css/style.css","./js/frac.js","./js/parser.js","./js/markdown.js","./js/types.js","./js/solver.js","./js/app.js","./manifest.json","./version.json","./offline-manifest.json","./icons/icon-192.png"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.endsWith("/version.json") || url.pathname.endsWith("/offline-manifest.json")) {
    event.respondWith(fetch(event.request).then(r => { const copy=r.clone(); caches.open(CACHE).then(c=>c.put(event.request,copy)); return r; }).catch(()=>caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { const copy=response.clone(); caches.open(CACHE).then(c=>c.put(event.request,copy)); return response; }).catch(()=>caches.match("./index.html"))));
});
