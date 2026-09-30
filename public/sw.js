/* Offline: App-Dateien vorab (alle Reisen laufen über dieselbe Seite), Seite netzwerk-zuerst, Karten-Kacheln/Fotos/Wetter aus dem Cache als Rückfall.
   Bei Änderungen an App-Dateien VERSION hochzählen. */
const VERSION = "v2";
const APP = "irland-app-" + VERSION;
const RUNTIME = "irland-runtime";
const MAX_RUNTIME = 400;
const PRECACHE = [
  "/", "/manifest.webmanifest",
  "/assets/app.css?v=2", "/assets/app.js?v=2",
  "/assets/trips/florenz.js?v=2", "/assets/trips/irland.js?v=2",
  "/assets/vendor/leaflet/leaflet.css", "/assets/vendor/leaflet/leaflet.js",
  "/assets/fonts/inter.woff2", "/assets/fonts/fraunces.woff2",
  "/icons/hub-192.png", "/icons/favicon-32.png", "/icons/irland-192.png", "/icons/florenz.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(APP).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("irland-app-") && k !== APP).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_RUNTIME; i++) await cache.delete(keys[i]);
}

async function networkFirst(req, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), timeoutMs))
    ]);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") { cache.put(req, res.clone()); if (cacheName === RUNTIME) trim(cache); }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    e.respondWith(networkFirst(req, APP, 3000).catch(() => caches.match("/", { cacheName: APP })));
  } else if (url.origin === location.origin) {
    e.respondWith(cacheFirst(req, APP));
  } else if (url.hostname.endsWith("basemaps.cartocdn.com") || url.hostname === "upload.wikimedia.org") {
    e.respondWith(cacheFirst(req, RUNTIME));
  }
  // Wetter: normal übers Netz, die App merkt sich die letzte Vorhersage selbst.
});
