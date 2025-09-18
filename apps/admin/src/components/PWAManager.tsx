'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ServiceWorkerRegistration {
  active: ServiceWorker | null;
  installing: ServiceWorker | null;
  waiting: ServiceWorker | null;
  updateViaCache: 'all' | 'imports' | 'none';
  onupdatefound: ((this: ServiceWorkerRegistration, ev: Event) => any) | null;
  oncontrollerchange: ((this: ServiceWorkerRegistration, ev: Event) => any) | null;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  dispatchEvent(evt: Event): boolean;
  getNotifications(filter?: any): Promise<Notification[]>;
  showNotification(title: string, options?: NotificationOptions): Promise<void>;
  requestPermission(): Promise<NotificationPermission>;
  update(): Promise<void>;
  unregister(): Promise<boolean>;
  sync?: {
    register(tag: string): Promise<void>;
  };
}

export default function PWAManager() {
  const [isOnline, setIsOnline] = useState(true);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Verificar estado de conexión
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Registrar service worker
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          setSwRegistration(registration as any);

          // Escuchar actualizaciones del service worker
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                }
              });
            }
          });

          // Escuchar cambios de controlador
          registration.addEventListener('controllerchange', () => {
            window.location.reload();
          });

        } catch (error) {
          console.error('Error registrando Service Worker:', error);
        }
      }
    };

    // Solicitar permisos de notificación
    const requestNotificationPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch (error) {
          console.error('Error solicitando permisos de notificación:', error);
        }
      }
    };

    // Inicializar PWA
    registerServiceWorker();
    requestNotificationPermission();

    // Eventos de conexión
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Función para actualizar la aplicación
  const updateApp = () => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setUpdateAvailable(false);
      toast.success('Actualizando aplicación...', {
        description: 'La página se recargará automáticamente'
      });
    }
  };

  // Función para enviar notificación de prueba
  const sendTestNotification = async () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        await swRegistration?.showNotification('Admin Polideportivo', {
          body: 'Esta es una notificación de prueba',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: 'test-notification'
        });
        toast.success('Notificación enviada');
      } catch (error) {
        console.error('❌ Error enviando notificación:', error);
        toast.error('Error enviando notificación');
      }
    } else {
      toast.error('Permisos de notificación no concedidos');
    }
  };

  // Función para sincronizar en segundo plano
  const triggerBackgroundSync = async () => {
    if ('serviceWorker' in navigator && swRegistration?.sync) {
      try {
        await swRegistration.sync.register('background-sync');
        toast.success('Sincronización iniciada', {
          description: 'Los datos se sincronizarán en segundo plano'
        });
      } catch (error) {
        console.error('❌ Error iniciando sincronización:', error);
        toast.error('Error iniciando sincronización');
      }
    } else {
      toast.error('Sincronización en segundo plano no soportada');
    }
  };

  // Función para limpiar cache
  const clearCache = async () => {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        toast.success('Cache limpiado', {
          description: 'Todos los datos en cache han sido eliminados'
        });
      } catch (error) {
        console.error('❌ Error limpiando cache:', error);
        toast.error('Error limpiando cache');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Estado de conexión */}
      <div className={`p-3 rounded-lg border ${
        isOnline 
          ? 'bg-green-50 border-green-200 text-green-800' 
          : 'bg-yellow-50 border-yellow-200 text-yellow-800'
      }`}>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-yellow-500'
          }`} />
          <span className="text-sm font-medium">
            {isOnline ? 'En línea' : 'Sin conexión'}
          </span>
        </div>
      </div>

      {/* Actualización disponible */}
      {updateAvailable && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm font-medium text-blue-800">
                Nueva versión disponible
              </span>
            </div>
            <button
              onClick={updateApp}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
            >
              Actualizar
            </button>
          </div>
        </div>
      )}

      {/* Acciones PWA */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={sendTestNotification}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🔔 Probar Notificación
          </button>
          
          <button
            onClick={triggerBackgroundSync}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🔄 Sincronizar
          </button>
          
          <button
            onClick={clearCache}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🗑️ Limpiar Cache
          </button>
        </div>
      </div>

      {/* Información del Service Worker */}
      {swRegistration && (
        <div className="space-y-3">
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Estado del Service Worker</h4>
            <div className="space-y-1 text-xs text-gray-600">
              <div>Estado: {swRegistration.active ? 'Activo' : 'Inactivo'}</div>
              <div>Actualización: {updateAvailable ? 'Disponible' : 'Al día'}</div>
              <div>Notificaciones: {Notification.permission}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
