/**
 * Logger condicional para producción
 * Oculta logs en producción, los mantiene en desarrollo
 */

export class Logger {
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  log(...args: any[]) {
    if (!this.isProduction) {
      console.log(...args);
    }
  }

  error(...args: any[]) {
    // Los errores siempre se muestran, incluso en producción
    console.error(...args);
  }

  warn(...args: any[]) {
    if (!this.isProduction) {
      console.warn(...args);
    }
  }

  info(...args: any[]) {
    if (!this.isProduction) {
      console.info(...args);
    }
  }

  debug(...args: any[]) {
    if (!this.isProduction) {
      console.log('[DEBUG]', ...args);
    }
  }

  // Método para logs críticos que siempre deben mostrarse
  critical(...args: any[]) {
    console.error('[CRITICAL]', ...args);
  }
}

// Exportar instancia única
export const logger = new Logger();

// Función helper para reemplazar console.log fácilmente
export const log = logger.log.bind(logger);
export const logError = logger.error.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logDebug = logger.debug.bind(logger);
export const logCritical = logger.critical.bind(logger);











