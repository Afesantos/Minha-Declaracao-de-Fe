// Service Worker para PWA
const CACHE_NAME = 'declaracao-fe-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Passa as requisições pela rede com fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
