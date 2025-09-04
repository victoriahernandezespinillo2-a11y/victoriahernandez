// Service Worker mínimo para Admin Polideportivo PWA
// Solo registro básico sin cache para evitar errores

const CACHE_NAME = 'admin-polideportivo-v1';

// Evento de instalación - solo registro
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker instalando...');
  event.waitUntil(
    Promise.resolve()
      .then(() => {
        console.log('✅ Service Worker instalado correctamente');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Error en instalación del Service Worker:', error);
        return self.skipWaiting();
      })
  );
});

// Evento de activación - solo limpieza básica
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
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

// NO interceptar ningún request - dejar que todo funcione normalmente
// self.addEventListener('fetch', (event) => {
//   // No hacer nada - dejar que las requests vayan directo
// });

// Evento de mensaje para comunicación con la app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

  // Estrategia para archivos estáticos
  if (request.method === 'GET' && isStaticFile(request.url)) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            console.log('📦 Sirviendo desde cache:', request.url);
            return response;
          }
          return fetch(request)
            .then((fetchResponse) => {
              // Cachear la respuesta para futuras peticiones
              if (fetchResponse && fetchResponse.status === 200) {
                const responseToCache = fetchResponse.clone();
                caches.open(DYNAMIC_CACHE).then((cache) => {
                  cache.put(request, responseToCache);
                });
              }
              return fetchResponse;
            });
        })
        .catch(() => {
          // Fallback offline para archivos críticos
          if (request.url.endsWith('.html') || request.url.endsWith('/')) {
            return caches.match('/');
          }
        })
    );
  }

  // Estrategia network first para API calls
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cachear respuestas exitosas de la API
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Intentar servir desde cache si falla la red
          return caches.match(request);
        })
    );
  }
});

// Función para identificar archivos estáticos
function isStaticFile(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => url.includes(ext)) || 
         url.includes('/icons/') || 
         url.includes('/manifest.json');
}

// Evento de mensaje para comunicación con la app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Evento de sync en segundo plano
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Sincronización en segundo plano iniciada');
    event.waitUntil(doBackgroundSync());
  }
});

// Función de sincronización en segundo plano
async function doBackgroundSync() {
  try {
    // Aquí se pueden implementar tareas de sincronización
    // como enviar datos offline, actualizar cache, etc.
    console.log('✅ Sincronización en segundo plano completada');
  } catch (error) {
    console.error('❌ Error en sincronización en segundo plano:', error);
  }
}

// Evento de push para notificaciones
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Nueva notificación del sistema',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'Ver',
          icon: '/icons/icon-72x72.png'
        },
        {
          action: 'close',
          title: 'Cerrar',
          icon: '/icons/icon-72x72.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Admin Polideportivo', options)
    );
  }
});

// Evento de click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
