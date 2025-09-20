/**
 * Chunk Error Handler Enterprise
 * 
 * Utilidad robusta para manejar errores de chunks en producción
 * Implementa estrategias de recuperación automática y logging
 */

interface ChunkErrorHandlerConfig {
  maxRetries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
  enableCacheClear?: boolean;
}

class ChunkErrorHandler {
  private retryCount = 0;
  private maxRetries: number;
  private retryDelay: number;
  private enableLogging: boolean;
  private enableCacheClear: boolean;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(config: ChunkErrorHandlerConfig = {}) {
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 2000;
    this.enableLogging = config.enableLogging ?? true;
    this.enableCacheClear = config.enableCacheClear ?? true;
  }

  /**
   * Inicializa el manejador de errores de chunks
   */
  public init(): void {
    if (typeof window === 'undefined') return;

    // Escuchar errores de chunks
    window.addEventListener('error', this.handleError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

    // Escuchar eventos de carga de recursos
    window.addEventListener('load', this.handlePageLoad.bind(this));

    if (this.enableLogging) {
      console.log('🔄 [CHUNK-ERROR-HANDLER] Inicializado con configuración:', {
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay,
        enableLogging: this.enableLogging,
        enableCacheClear: this.enableCacheClear
      });
    }
  }

  /**
   * Limpia los recursos del manejador
   */
  public cleanup(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('error', this.handleError.bind(this));
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
      window.removeEventListener('load', this.handlePageLoad.bind(this));
    }
  }

  /**
   * Maneja errores de JavaScript
   */
  private handleError(event: ErrorEvent): void {
    const error = event.error;
    
    if (this.isChunkLoadError(error)) {
      this.log('🚨 [CHUNK-ERROR] Error de chunk detectado:', error);
      this.handleChunkError(error);
    }
  }

  /**
   * Maneja promesas rechazadas no manejadas
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const error = event.reason;
    
    if (this.isChunkLoadError(error)) {
      this.log('🚨 [CHUNK-ERROR] Promesa rechazada por error de chunk:', error);
      this.handleChunkError(error);
    }
  }

  /**
   * Maneja la carga completa de la página
   */
  private handlePageLoad(): void {
    // Resetear contador de reintentos cuando la página se carga completamente
    this.retryCount = 0;
    this.log('✅ [CHUNK-ERROR-HANDLER] Página cargada completamente, contador de reintentos reseteado');
  }

  /**
   * Verifica si un error es un ChunkLoadError
   */
  private isChunkLoadError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || error.toString();
    const errorName = error.name || '';

    return (
      errorName === 'ChunkLoadError' ||
      errorMessage.includes('Loading chunk') ||
      errorMessage.includes('Loading CSS chunk') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('NetworkError')
    );
  }

  /**
   * Maneja errores de chunks específicamente
   */
  private handleChunkError(error: any): void {
    if (this.retryCount >= this.maxRetries) {
      this.log('🚨 [CHUNK-ERROR] Máximo de reintentos alcanzado, mostrando error al usuario');
      this.showUserError();
      return;
    }

    this.retryCount++;
    this.log(`🔄 [CHUNK-ERROR] Reintentando carga de chunk (intento ${this.retryCount}/${this.maxRetries})`);

    // Limpiar timeout anterior si existe
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    // Limpiar cache si está habilitado
    if (this.enableCacheClear) {
      this.clearCache();
    }

    // Reintentar después de un delay exponencial
    const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
    this.retryTimeout = setTimeout(() => {
      this.retryChunkLoad();
    }, delay);
  }

  /**
   * Limpia el cache del navegador
   */
  private async clearCache(): Promise<void> {
    if (typeof window === 'undefined' || !('caches' in window)) return;

    try {
      const cacheNames = await caches.keys();
      const relevantCaches = cacheNames.filter(name => 
        name.includes('next-') || 
        name.includes('chunks') || 
        name.includes('static')
      );

      await Promise.all(
        relevantCaches.map(cacheName => caches.delete(cacheName))
      );

      this.log(`🧹 [CHUNK-ERROR] Cache limpiado: ${relevantCaches.length} caches eliminados`);
    } catch (error) {
      this.log('⚠️ [CHUNK-ERROR] Error al limpiar cache:', error);
    }
  }

  /**
   * Reintenta la carga de chunks
   */
  private retryChunkLoad(): void {
    this.log('🔄 [CHUNK-ERROR] Reintentando carga de chunks...');
    
    // Recargar la página
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  /**
   * Muestra un error al usuario cuando se agotan los reintentos
   */
  private showUserError(): void {
    // Crear un modal de error o mostrar una notificación
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background: white;
          padding: 2rem;
          border-radius: 8px;
          text-align: center;
          max-width: 400px;
          margin: 1rem;
        ">
          <h2 style="color: #dc2626; margin-bottom: 1rem;">Error de Carga</h2>
          <p style="color: #6b7280; margin-bottom: 1.5rem;">
            No se pudo cargar la aplicación. Por favor, recarga la página.
          </p>
          <button onclick="window.location.reload()" style="
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
          ">
            Recargar Página
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(errorDiv);
  }

  /**
   * Logging condicional
   */
  private log(message: string, ...args: any[]): void {
    if (this.enableLogging) {
      console.log(message, ...args);
    }
  }

  /**
   * Obtiene estadísticas del manejador
   */
  public getStats() {
    return {
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      isActive: this.retryTimeout !== null
    };
  }
}

// Instancia singleton del manejador
let chunkErrorHandler: ChunkErrorHandler | null = null;

/**
 * Inicializa el manejador de errores de chunks
 */
export function initChunkErrorHandler(config?: ChunkErrorHandlerConfig): ChunkErrorHandler {
  if (chunkErrorHandler) {
    chunkErrorHandler.cleanup();
  }

  chunkErrorHandler = new ChunkErrorHandler(config);
  chunkErrorHandler.init();
  
  return chunkErrorHandler;
}

/**
 * Obtiene la instancia actual del manejador
 */
export function getChunkErrorHandler(): ChunkErrorHandler | null {
  return chunkErrorHandler;
}

/**
 * Limpia el manejador de errores
 */
export function cleanupChunkErrorHandler(): void {
  if (chunkErrorHandler) {
    chunkErrorHandler.cleanup();
    chunkErrorHandler = null;
  }
}

// Auto-inicialización en el cliente
if (typeof window !== 'undefined') {
  // Inicializar con configuración por defecto
  initChunkErrorHandler({
    maxRetries: 3,
    retryDelay: 2000,
    enableLogging: process.env.NODE_ENV === 'development',
    enableCacheClear: true
  });
}

export default ChunkErrorHandler;










