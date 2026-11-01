// Service Worker para PWA
const CACHE_NAME = 'declaracao-fe-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Garante que todas as requisições passem normalmente pela rede
});
