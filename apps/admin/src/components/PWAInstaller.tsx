'use client';

import { useState, useEffect } from 'react';
import { 
  DevicePhoneMobileIcon, 
  ComputerDesktopIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Verificar si ya está instalado
    const checkInstallation = () => {
      // Verificar si está en modo standalone (instalado)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsStandalone(true);
        setIsInstalled(true);
        return;
      }

      // Verificar si está en modo standalone en iOS
      if ((window.navigator as any).standalone === true) {
        setIsStandalone(true);
        setIsInstalled(true);
        return;
      }

      // Verificar si está en modo standalone en Android
      if (window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone === true) {
        setIsStandalone(true);
        setIsInstalled(true);
        return;
      }
    };

    checkInstallation();

    // Escuchar el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    // Escuchar el evento appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      console.log('✅ PWA instalada correctamente');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    try {
      // Mostrar el prompt de instalación
      await deferredPrompt.prompt();
      
      // Esperar la respuesta del usuario
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ Usuario aceptó instalar la PWA');
        setIsInstalled(true);
        setShowInstallPrompt(false);
      } else {
        console.log('❌ Usuario rechazó instalar la PWA');
      }
      
      // Limpiar el prompt
      setDeferredPrompt(null);
    } catch (error) {
      console.error('❌ Error al instalar la PWA:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  // No mostrar si ya está instalado o en modo standalone
  if (isInstalled || isStandalone || !showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <DevicePhoneMobileIcon className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900">
                Instalar App de Administración
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Accede rápidamente desde tu dispositivo móvil o escritorio
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mt-3 flex space-x-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
          >
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-3 rounded-md transition-colors"
          >
            Más tarde
          </button>
        </div>
        
        <div className="mt-3 flex items-center space-x-2 text-xs text-gray-500">
          <ComputerDesktopIcon className="h-4 w-4" />
          <span>Disponible para móvil y escritorio</span>
        </div>
      </div>
    </div>
  );
}
