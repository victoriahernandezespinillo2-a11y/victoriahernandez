// Service Worker mínimo para Admin Polideportivo PWA
// Solo registro básico, sin estrategias de cache en desarrollo/producción para evitar interferencias

const CACHE_NAME = 'admin-polideportivo-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.map((n) => (n !== CACHE_NAME ? caches.delete(n) : Promise.resolve())))).then(() => self.clients.claim())
  );
});

// No interceptamos fetch en esta versión
// self.addEventListener('fetch', () => {});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
