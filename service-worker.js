/* Africa54 — Service Worker
   - The page (HTML): network first, so players get updates; the cached copy
     is used only when offline (Practice Solo works offline).
   - Icons and fonts: cache first.
   - The game backend (Google Apps Script) is never cached: sessions, scores
     and leaderboards must always be live. */

const CACHE_NAME = 'africa54-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './sca-symbol-192.png',
  './sca-symbol-512.png'
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function cacheCopy(req, res) {
  if (res && res.status === 200) {
    const copy = res.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = FONT_HOSTS.includes(url.hostname);

  // Anything else (the Apps Script API above all) goes straight to the network.
  if (!sameOrigin && !isFont) return;

  // The page itself: network first, cached copy when offline.
  if (req.mode === 'navigate' || (sameOrigin && url.pathname.endsWith('.html'))) {
    event.respondWith(
      fetch(req)
        .then((res) => cacheCopy(req, res))
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // Icons, manifest, fonts: cache first.
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => cacheCopy(req, res)))
  );
});
