'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode, useEffect, useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface SessionWrapperProps {
  children: ReactNode;
}

/**
 * SessionWrapper Enterprise con manejo robusto de errores de chunks
 * Implementa estrategias de recuperación y fallback para NextAuth
 */
export function SessionWrapper({ children }: SessionWrapperProps) {
  const [isClient, setIsClient] = useState(false);
  const [sessionError, setSessionError] = useState<Error | null>(null);

  useEffect(() => {
    // Asegurar que estamos en el cliente
    setIsClient(true);
    
    let retryCount = 0;
    const maxRetries = 3;
    
    // Manejar errores de chunks globalmente con estrategia de reintentos
    const handleChunkError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const error = event instanceof ErrorEvent ? event.error : event.reason;
      const isChunkError = error?.name === 'ChunkLoadError' || 
                          error?.message?.includes('Loading chunk') ||
                          error?.message?.includes('timeout') ||
                          (event instanceof ErrorEvent && event.target && 
                           (event.target as HTMLElement).tagName === 'SCRIPT');
      
      if (isChunkError) {
        if (retryCount >= maxRetries) {
          console.error('🚨 [SESSION-WRAPPER] Máximo de reintentos alcanzado para chunk error');
          setSessionError(new Error('Error al cargar la aplicación. Por favor, recarga la página manualmente.'));
          return;
        }
        
        retryCount++;
        console.log(`🔄 [SESSION-WRAPPER] Detectado error de chunk, reintentando... (${retryCount}/${maxRetries})`);
        setSessionError(error as Error);
        
        // Limpiar cache y recargar después de un delay exponencial
        const delay = 1000 * Math.pow(2, retryCount - 1); // Backoff exponencial: 1s, 2s, 4s
        
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            // Limpiar todas las cachés relacionadas con Next.js
            if ('caches' in window) {
              caches.keys().then(cacheNames => {
                cacheNames.forEach(cacheName => {
                  if (cacheName.includes('next-') || 
                      cacheName.includes('chunks') || 
                      cacheName.includes('static')) {
                    caches.delete(cacheName).catch(() => {
                      // Ignorar errores al eliminar cachés
                    });
                  }
                });
              }).catch(() => {
                // Continuar aunque falle la limpieza de caché
              });
            }
            
            // Limpiar el sessionStorage y localStorage de Next.js
            try {
              Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('next-') || key.includes('chunk')) {
                  sessionStorage.removeItem(key);
                }
              });
            } catch (e) {
              // Ignorar errores de sessionStorage
            }
            
            // Recargar la página
            window.location.reload();
          }
        }, delay);
      }
    };

    // Escuchar errores de chunks
    window.addEventListener('error', handleChunkError as EventListener);
    window.addEventListener('unhandledrejection', handleChunkError as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('error', handleChunkError as EventListener);
      window.removeEventListener('unhandledrejection', handleChunkError as EventListener);
    };
  }, []);

  // Fallback para errores de sesión
  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Reintentando conexión...</p>
        </div>
      </div>
    );
  }

  // No renderizar hasta que estemos en el cliente
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <SessionProvider 
        basePath="/api/auth"
        refetchInterval={0}
        refetchOnWindowFocus={false}
        // Configuración robusta para producción
        refetchWhenOffline={false}
      >
        {children}
      </SessionProvider>
    </ErrorBoundary>
  );
}