/* NEON ∞ service worker — makes the game installable and playable offline.
   Strategy: network-first for the game itself (one file that updates often,
   so a live visit always gets the newest build), cache fallback when offline;
   cache-first for the icons and manifest, which almost never change. */
const CACHE = 'neon-infinity-v1';
const ASSETS = ['./', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; /* API calls etc. go straight out */
  const isGame = e.request.mode === 'navigate' || url.pathname.endsWith('index.html');
  if (isGame) {
    /* network-first: fresh build when online, cached build offline */
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
  } else {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
  }
});
