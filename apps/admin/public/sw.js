// Service Worker para Admin Polideportivo PWA
const CACHE_NAME = 'admin-polideportivo-v1';
const STATIC_CACHE = 'admin-static-v1';
const DYNAMIC_CACHE = 'admin-dynamic-v1';

// Archivos estáticos para cache (solo archivos específicos de la PWA)
const STATIC_FILES = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Función para verificar si un archivo es estático de la PWA (NO de Next.js)
function isPWAStaticFile(url) {
  // Solo archivos específicos de la PWA, NO archivos de Next.js
  return url.includes('/manifest.json') || 
         url.includes('/icons/icon-192x192.png') || 
         url.includes('/icons/icon-512x512.png');
}

// Evento de instalación
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker instalando...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Cacheando archivos de PWA');
        // Solo cachear archivos que sabemos que existen
        const validFiles = STATIC_FILES.filter(file => {
          try {
            return new URL(file, self.location.origin);
          } catch {
            return false;
          }
        });
        return cache.addAll(validFiles);
      })
      .then(() => {
        console.log('✅ Service Worker instalado correctamente');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Error en instalación del Service Worker:', error);
        // Continuar con la instalación incluso si falla el cache
        return self.skipWaiting();
      })
  );
});

// Evento de activación
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('🗑️ Eliminando cache obsoleto:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activado');
      return self.clients.claim();
    })
  );
});

// Evento de fetch - SOLO para archivos específicos de la PWA
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptar requests del mismo origen
  if (url.origin !== location.origin) {
    return;
  }

  // NO interceptar requests de la API
  if (request.url.includes('/api/')) {
    return;
  }

  // NO interceptar archivos de Next.js (_next, webpack, etc.)
  if (request.url.includes('/_next/') || 
      request.url.includes('webpack') || 
      request.url.includes('chunks') ||
      request.url.includes('css') ||
      request.url.includes('js')) {
    return;
  }

  // SOLO interceptar archivos específicos de la PWA
  if (request.method === 'GET' && isPWAStaticFile(request.url)) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then((fetchResponse) => {
              // Solo cachear si la respuesta es válida
              if (fetchResponse && fetchResponse.status === 200) {
                const responseToCache = fetchResponse.clone();
                caches.open(DYNAMIC_CACHE).then((cache) => {
                  cache.put(request, responseToCache);
                });
              }
              return fetchResponse;
            })
            .catch(() => {
              // Si falla, no hacer nada especial
              return fetch(request);
            });
        })
    );
  }
});

// Evento de mensaje para comunicación con la app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
