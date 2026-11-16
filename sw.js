/* RahDas Bookshelf service worker. Caches the app itself and the cover pictures so the shelf opens offline.
   Data requests (POST to your script) are never cached or touched here. */
const VERSION = 'v-5e11d4bcea';
const SHELL = 'shell-' + VERSION, IMGS = 'covers-v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192-v2.png', 'icon-512-v2.png', 'apple-touch-icon-v2.png'];
const MAX_IMGS = 250;

self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('shell-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_IMGS; i++) await cache.delete(keys[i]);
}
async function swr(req, cacheName, fallbackKey) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req, { ignoreSearch: false }) || (fallbackKey && await cache.match(fallbackKey));
  const net = fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) { cache.put(req, res.clone()).then(() => cacheName === IMGS && trim(cache)); }
    return res;
  }).catch(() => null);
  return hit || (await net) || Response.error();
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    e.respondWith(swr(req, SHELL, req.mode === 'navigate' ? 'index.html' : null));
  } else if (req.destination === 'image' && /(^|\.)(drive\.google\.com|googleusercontent\.com)$/.test(url.hostname)) {
    e.respondWith(swr(req, IMGS));
  }
});
