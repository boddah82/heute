// Offline-Cache für die App-Dateien. Bei Änderungen VERSION erhöhen.
const VERSION = 'rh-v1';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'data/tasks.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', '../lernen/vendor/anthropic-sdk.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // nur eigene alte Caches löschen (die Sprach-App nutzt „sl-…“)
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('rh-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Netzwerk zuerst (damit Updates ankommen), offline aus dem Cache
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
