// mungo service worker: the app opens offline; book data itself lives in the browser (localStorage), not here.
// Bump VERSION on every release so phones pick up the new index.html.
const VERSION = 'mungo-v30';
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-48.png'
];
// Third-party files worth keeping offline: fonts, book covers, the barcode reader (ZXing) and its WebAssembly.
const RUNTIME_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'covers.openlibrary.org', 'fastly.jsdelivr.net', 'cdn.jsdelivr.net'];
const RUNTIME_LIMIT = 300;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimRuntime() {
  const cache = await caches.open(RUNTIME);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - RUNTIME_LIMIT; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // The app page: try the network first so updates arrive, fall back to the cached copy offline.
  if (req.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(SHELL).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Own static files: cache first.
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }

  // Covers, fonts, barcode reader: serve from cache, refresh in the background.
  // Catalog searches (Google Books, Open Library search, Inventaire) always go to the network.
  if (RUNTIME_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(RUNTIME).then(async cache => {
        const hit = await cache.match(req);
        const fresh = fetch(req).then(res => {
          if (res.ok || res.type === 'opaque') { cache.put(req, res.clone()); trimRuntime(); }
          return res;
        }).catch(() => hit);
        return hit || fresh;
      })
    );
  }
});
