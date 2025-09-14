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
    
    // Manejar errores de chunks globalmente
    const handleChunkError = (event: ErrorEvent) => {
      if (event.error?.name === 'ChunkLoadError' || 
          event.error?.message?.includes('Loading chunk')) {
        console.log('🔄 [SESSION-WRAPPER] Detectado error de chunk, reintentando...');
        setSessionError(event.error);
        
        // Limpiar cache y recargar después de un delay
        setTimeout(() => {
          if (typeof window !== 'undefined' && 'caches' in window) {
            caches.keys().then(cacheNames => {
              cacheNames.forEach(cacheName => {
                if (cacheName.includes('next-') || cacheName.includes('chunks')) {
                  caches.delete(cacheName);
                }
              });
            });
          }
          window.location.reload();
        }, 2000);
      }
    };

    // Escuchar errores de chunks
    window.addEventListener('error', handleChunkError);
    
    // Cleanup
    return () => {
      window.removeEventListener('error', handleChunkError);
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