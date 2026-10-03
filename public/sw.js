/* Offline: App-Dateien vorab (alle Reisen laufen über dieselbe Seite), Seite netzwerk-zuerst, Karten-Kacheln/Fotos/Wetter aus dem Cache als Rückfall.
   Bei Änderungen an App-Dateien VERSION hochzählen. */
const VERSION = "v17";
const APP = "irland-app-" + VERSION;
const RUNTIME = "irland-runtime";
const MAX_RUNTIME = 300;          // Kartenkacheln
const IMAGES = "irland-img";      // Fotos (Wikipedia/Wikimedia), eigener kleinerer Cache
const MAX_IMAGES = 150;
const PRECACHE = [
  "/", "/manifest.webmanifest",
  "/assets/app.css?v=17", "/assets/app.js?v=17", "/assets/icons.svg",
  "/assets/trips/florenz.js?v=17", "/assets/trips/irland.js?v=17", "/assets/inspiration.js?v=17",
  "/assets/vendor/leaflet/leaflet.css", "/assets/vendor/leaflet/leaflet.js",
  "/assets/fonts/inter.woff2",
  "/icons/favicon-32.png", "/icons/reisen.svg", "/icons/irland.svg", "/icons/florenz.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(APP).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("irland-app-") && k !== APP).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
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
  if (res.ok || res.type === "opaque") { cache.put(req, res.clone()); if (cacheName === RUNTIME) trim(cache, MAX_RUNTIME); if (cacheName === IMAGES) trim(cache, MAX_IMAGES); }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    e.respondWith(networkFirst(req, APP, 3000).catch(() => caches.match("/", { cacheName: APP })));
  } else if (url.pathname === "/photos/photos.json") {
    e.respondWith(networkFirst(req, APP, 3000));
  } else if (url.origin === location.origin && url.pathname.startsWith("/photos/")) {
    e.respondWith(cacheFirst(req, IMAGES));
  } else if (url.origin === location.origin) {
    e.respondWith(cacheFirst(req, APP));
  } else if (url.hostname.endsWith("basemaps.cartocdn.com")) {
    e.respondWith(cacheFirst(req, RUNTIME));
  } else if (url.hostname.endsWith("wikimedia.org")) {
    e.respondWith(cacheFirst(req, IMAGES));
  }
  // Wetter: normal übers Netz, die App merkt sich die letzte Vorhersage selbst.
});
