const VERSION = "mungo-v38";

const SHELL = `${VERSION}-shell`;

const RUNTIME = `${VERSION}-runtime`;

const SHELL_FILES = [ "./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./icons/apple-touch-icon.png", "./icons/favicon-48.png" ];

const RUNTIME_HOSTS = [ "fonts.googleapis.com", "fonts.gstatic.com", "covers.openlibrary.org", "fastly.jsdelivr.net", "cdn.jsdelivr.net" ];

const RUNTIME_LIMIT = 300;

self.addEventListener("install", event => {
    event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(SHELL_FILES.map(path => new Request(path, {cache: "reload"})))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => /^mungo-v\d+-(shell|runtime)$/.test(k) && k !== SHELL && k !== RUNTIME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trimRuntime() {
    const cache = await caches.open(RUNTIME);
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - RUNTIME_LIMIT; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", event => {
    const req = event.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);
    const shellPage = ["./", "./index.html"].some(path => url.href.split(/[?#]/, 1)[0] === new URL(path, self.registration.scope).href);
    if (req.mode === "navigate" && shellPage) {
        event.respondWith(fetch(req).then(async res => {
            if (res.ok) {
                const cache = await caches.open(SHELL);
                await cache.put("./index.html", res.clone()).catch(() => {});
            }
            return res;
        }).catch(() => caches.match("./index.html")));
        return;
    }
    if (url.origin === self.location.origin) {
        event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
        return;
    }
    if (RUNTIME_HOSTS.includes(url.hostname)) {
        event.respondWith(caches.open(RUNTIME).then(async cache => {
            const hit = await cache.match(req);
            const fresh = fetch(req).then(res => {
                if (res.ok || res.type === "opaque") {
                    cache.put(req, res.clone());
                    trimRuntime();
                }
                return res;
            }).catch(() => hit);
            return hit || fresh;
        }));
    }
});
