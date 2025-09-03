'use client';

import { useState, useEffect } from 'react';
import { 
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import PWAManager from '../../../components/PWAManager';

interface PWAStatus {
  isInstalled: boolean;
  isStandalone: boolean;
  hasServiceWorker: boolean;
  hasNotifications: boolean;
  hasBackgroundSync: boolean;
  hasCache: boolean;
}

export default function PWASettingsPage() {
  const [pwaStatus, setPwaStatus] = useState<PWAStatus>({
    isInstalled: false,
    isStandalone: false,
    hasServiceWorker: false,
    hasNotifications: false,
    hasBackgroundSync: false,
    hasCache: false
  });

  useEffect(() => {
    // Verificar estado de PWA
    const checkPWAStatus = () => {
      const status: PWAStatus = {
        isInstalled: false,
        isStandalone: false,
        hasServiceWorker: false,
        hasNotifications: false,
        hasBackgroundSync: false,
        hasCache: false
      };

      // Verificar si está instalado
      if (window.matchMedia('(display-mode: standalone)').matches) {
        status.isStandalone = true;
        status.isInstalled = true;
      }

      // Verificar iOS standalone
      if ((window.navigator as any).standalone === true) {
        status.isStandalone = true;
        status.isInstalled = true;
      }

      // Verificar service worker
      if ('serviceWorker' in navigator) {
        status.hasServiceWorker = true;
      }

      // Verificar notificaciones
      if ('Notification' in window) {
        status.hasNotifications = true;
      }

      // Verificar background sync
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        status.hasBackgroundSync = true;
      }

      // Verificar cache
      if ('caches' in window) {
        status.hasCache = true;
      }

      setPwaStatus(status);
    };

    checkPWAStatus();
  }, []);

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircleIcon className="h-5 w-5 text-green-500" />
    ) : (
      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
    );
  };

  const getStatusText = (status: boolean) => {
    return status ? 'Disponible' : 'No disponible';
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'text-green-700' : 'text-yellow-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-center space-x-3">
          <DevicePhoneMobileIcon className="h-8 w-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Configuración PWA
            </h1>
            <p className="text-gray-600 mt-1">
              Gestiona la aplicación web progresiva del panel de administración
            </p>
          </div>
        </div>
      </div>

      {/* Estado de PWA */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Estado de la PWA</h2>
          <p className="text-sm text-gray-600 mt-1">
            Verifica el estado de las funcionalidades PWA
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(pwaStatus.isInstalled)}
              <div>
                <div className="font-medium text-gray-900">Instalación</div>
                <div className={`text-sm ${getStatusColor(pwaStatus.isInstalled)}`}>
                  {getStatusText(pwaStatus.isInstalled)}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(pwaStatus.isStandalone)}
              <div>
                <div className="font-medium text-gray-900">Modo Standalone</div>
                <div className={`text-sm ${getStatusColor(pwaStatus.isStandalone)}`}>
                  {getStatusText(pwaStatus.isStandalone)}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(pwaStatus.hasServiceWorker)}
              <div>
                <div className="font-medium text-gray-900">Service Worker</div>
                <div className={`text-sm ${getStatusColor(pwaStatus.hasServiceWorker)}`}>
                  {getStatusText(pwaStatus.hasServiceWorker)}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(pwaStatus.hasNotifications)}
              <div>
                <div className="font-medium text-gray-900">Notificaciones</div>
                <div className={`text-sm ${getStatusColor(pwaStatus.hasNotifications)}`}>
                  {getStatusText(pwaStatus.hasNotifications)}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(pwaStatus.hasBackgroundSync)}
              <div>
                <div className="font-medium text-gray-900">Sincronización</div>
                <div className={`text-sm ${getStatusColor(pwaStatus.hasBackgroundSync)}`}>
                  {getStatusText(pwaStatus.hasBackgroundSync)}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(pwaStatus.hasCache)}
              <div>
                <div className="font-medium text-gray-900">Cache</div>
                <div className={`text-sm ${getStatusColor(pwaStatus.hasCache)}`}>
                  {getStatusText(pwaStatus.hasCache)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gestor PWA */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Gestor PWA</h2>
          <p className="text-sm text-gray-600 mt-1">
            Controla las funcionalidades PWA del sistema
          </p>
        </div>
        <div className="p-6">
          <PWAManager />
        </div>
      </div>

      {/* Información de instalación */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-blue-900">
              Instalar como Aplicación
            </h3>
            <div className="mt-2 text-sm text-blue-700 space-y-2">
              <p>
                Para instalar esta aplicación en tu dispositivo:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Chrome/Edge:</strong> Haz clic en el botón "Instalar" que aparece en la barra de direcciones</li>
                <li><strong>Safari (iOS):</strong> Toca el botón compartir y selecciona "Añadir a pantalla de inicio"</li>
                <li><strong>Android:</strong> Aparecerá un banner de instalación automáticamente</li>
              </ul>
              <p className="mt-3">
                Una vez instalada, la aplicación funcionará como una app nativa con acceso offline y notificaciones push.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Características PWA */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Características PWA</h2>
          <p className="text-sm text-gray-600 mt-1">
            Funcionalidades disponibles en la aplicación
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                <DevicePhoneMobileIcon className="h-5 w-5 text-indigo-600" />
                <span>Móvil</span>
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Instalable en pantalla de inicio</li>
                <li>• Funcionamiento offline básico</li>
                <li>• Notificaciones push</li>
                <li>• Experiencia nativa</li>
                <li>• Sincronización automática</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                <ComputerDesktopIcon className="h-5 w-5 text-indigo-600" />
                <span>Escritorio</span>
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Instalable como aplicación</li>
                <li>• Acceso rápido desde menú inicio</li>
                <li>• Funcionamiento independiente del navegador</li>
                <li>• Cache inteligente</li>
                <li>• Actualizaciones automáticas</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
