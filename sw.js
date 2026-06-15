// sw.js — オフライン動作用キャッシュ
const CACHE = 'koyomi72-v1';
const ASSETS = [
  './', './index.html', './data.js', './engine.js', './particles.js',
  './sound.js', './app.js', './manifest.webmanifest',
  './icon.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png',
  './sounds/stream.m4a', './sounds/rain.m4a', './sounds/storm.m4a',
  './sounds/wind_soft.m4a', './sounds/wind_winter.m4a', './sounds/snow.m4a',
  './sounds/birds.m4a', './sounds/frogs.m4a', './sounds/semi.m4a',
  './sounds/higurashi.m4a', './sounds/insects.m4a', './sounds/furin.m4a',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request).then((resp) => {
      // 同一オリジンのGETのみキャッシュ追記
      if (e.request.method === 'GET' && resp.ok && new URL(e.request.url).origin === location.origin) {
        const clone = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
