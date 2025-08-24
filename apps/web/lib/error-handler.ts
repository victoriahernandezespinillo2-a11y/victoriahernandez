/**
 * Servicio centralizado para manejo de errores
 * Proporciona mensajes de usuario amigables y logging profesional
 */

export interface ErrorContext {
  action: string;
  endpoint?: string;
  userId?: string;
  timestamp: string;
}

export class ErrorHandler {
  /**
   * Mapea errores del backend a mensajes de usuario amigables
   */
  static getUserMessage(error: any, context: ErrorContext): string {
    // 🔍 MANEJO MEJORADO DE ERRORES VACÍOS O INCOMPLETOS
    if (!error) {
      return 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.';
    }
    
    // 🔍 EXTRAER MENSAJE DE ERROR DE LA ESTRUCTURA REAL (MISMA LÓGICA QUE logError)
    let errorMessage = '';
    if (error?.originalError?.error) {
      // Estructura: error.originalError.error (desde API)
      errorMessage = error.originalError.error;
    } else if (error?.message) {
      // Estructura: error.message (Error estándar)
      errorMessage = error.message;
    } else if (error?.error) {
      // Estructura: error.error (directo)
      errorMessage = error.error;
    } else if (typeof error === 'string') {
      // Estructura: string directo
      errorMessage = error;
    } else if (error?.status) {
      errorMessage = `Error HTTP ${error.status}: ${error.statusText || 'Error de servidor'}`;
    } else {
      return 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.';
    }
    
    // Normalizar el mensaje para comparaciones
    const normalizedMessage = errorMessage.toLowerCase();
    
    // 🔒 Errores de Mantenimiento
    if (normalizedMessage.includes('mantenimiento')) {
      return '⚠️ La cancha está en mantenimiento durante el horario solicitado. Por favor, selecciona otro horario o cancha.';
    }
    
    // ⏰ Errores de Disponibilidad
    if (normalizedMessage.includes('no disponible') || normalizedMessage.includes('conflicto')) {
      return '⏰ El horario seleccionado ya no está disponible. Por favor, selecciona otro horario.';
    }
    
    // 📅 Errores de Usuario
    if (normalizedMessage.includes('usuario ya tiene') || normalizedMessage.includes('ya tiene una reserva')) {
      return '📅 Ya tienes una reserva en ese horario. Por favor, selecciona otro horario.';
    }
    
    // 🏟️ Errores de Cancha
    if (normalizedMessage.includes('cancha no disponible')) {
      return '🏟️ La cancha seleccionada no está disponible. Por favor, selecciona otra cancha.';
    }
    
    // 🔐 Errores de Autenticación
    if (normalizedMessage.includes('no autorizado') || normalizedMessage.includes('unauthorized')) {
      return '🔐 No tienes permisos para realizar esta acción. Por favor, inicia sesión nuevamente.';
    }
    
    // 💳 Errores de Pago
    if (normalizedMessage.includes('pago') || normalizedMessage.includes('payment') || normalizedMessage.includes('stripe')) {
      return '💳 Error en el procesamiento del pago. Por favor, verifica tu método de pago.';
    }
    
    // 🕐 Errores de Horario
    if (normalizedMessage.includes('horario') || normalizedMessage.includes('tiempo')) {
      return '🕐 Error en el horario seleccionado. Por favor, verifica la fecha y hora.';
    }
    
    // 🚫 Errores de Conflicto de Reservas
    if (normalizedMessage.includes('ya tiene una reserva') || 
        normalizedMessage.includes('usuario ya tiene') ||
        normalizedMessage.includes('conflicto de reserva')) {
      return '⚠️ Ya tienes una reserva en ese horario. Por favor, selecciona otro horario o cancha.';
    }
    
    // 📍 Errores de Ubicación
    if (normalizedMessage.includes('centro') || normalizedMessage.includes('center')) {
      return '📍 Error con el centro deportivo. Por favor, selecciona otro centro.';
    }
    
    // 🔄 Errores de Red
    if (normalizedMessage.includes('network') || normalizedMessage.includes('fetch')) {
      return '🌐 Error de conexión. Por favor, verifica tu conexión a internet e inténtalo de nuevo.';
    }
    
    // 📊 Errores de Validación
    if (normalizedMessage.includes('validation') || normalizedMessage.includes('invalid')) {
      return '📝 Los datos ingresados no son válidos. Por favor, verifica la información e inténtalo de nuevo.';
    }
    
    // 🚫 Errores de Límites
    if (normalizedMessage.includes('limit') || normalizedMessage.includes('quota')) {
      return '🚫 Has alcanzado el límite permitido. Por favor, contacta al administrador.';
    }
    
    // 🔍 Si es un error HTTP específico, dar información útil
    if (error.status) {
      switch (error.status) {
        case 400:
          return '📝 Los datos enviados no son válidos. Por favor, verifica la información.';
        case 401:
          return '🔐 No tienes permisos para realizar esta acción. Por favor, inicia sesión nuevamente.';
        case 403:
          return '🚫 Acceso denegado. No tienes permisos para esta acción.';
        case 404:
          return '❌ El recurso solicitado no fue encontrado.';
        case 409:
          // 🔍 DETECTAR CONFLICTOS ESPECÍFICOS DE RESERVAS
          if (error?.originalError?.error?.includes('reserva') || 
              error?.originalError?.error?.includes('horario') ||
              error?.message?.includes('reserva') ||
              error?.message?.includes('horario')) {
            return '⚠️ Ya tienes una reserva en ese horario. Por favor, selecciona otro horario o cancha.';
          }
          return '⚠️ Hay un conflicto con la solicitud. Por favor, verifica los datos.';
        case 422:
          return '📋 Los datos enviados no pueden ser procesados. Por favor, verifica la información.';
        case 429:
          return '⏰ Has realizado demasiadas solicitudes. Por favor, espera un momento.';
        case 500:
          return '🔧 Error interno del servidor. Por favor, inténtalo de nuevo más tarde.';
        case 502:
        case 503:
        case 504:
          return '🌐 El servicio no está disponible en este momento. Por favor, inténtalo de nuevo más tarde.';
        default:
          return `⚠️ Error del servidor (${error.status}). Por favor, inténtalo de nuevo.`;
      }
    }
    
    // Mensaje genérico para errores no mapeados
    return `Ha ocurrido un error inesperado: ${errorMessage}. Por favor, inténtalo de nuevo o contacta al soporte.`;
  }

  /**
   * Logs profesional del error para debugging
   */
  static logError(error: any, context: ErrorContext): void {
    // 🔍 EXTRAER MENSAJE DE ERROR DE LA ESTRUCTURA REAL
    let errorMessage = 'Error sin mensaje';
    let errorDetails: any = {};
    
    if (error?.originalError?.error) {
      // Estructura: error.originalError.error (desde API)
      errorMessage = error.originalError.error;
      errorDetails = {
        error: error.originalError.error,
        status: error.originalError.status,
        details: error.originalError.details
      };
    } else if (error?.message) {
      // Estructura: error.message (Error estándar)
      errorMessage = error.message;
      errorDetails = {
        message: error.message,
        name: error.name,
        stack: error.stack
      };
    } else if (error?.error) {
      // Estructura: error.error (directo)
      errorMessage = error.error;
      errorDetails = { error: error.error };
    } else if (typeof error === 'string') {
      // Estructura: string directo
      errorMessage = error;
      errorDetails = { rawError: error };
    }
    
    // Crear objeto de información del error de forma segura para evitar problemas de serialización
    const safeErrorInfo = {
      message: errorMessage,
      code: error?.code,
      status: error?.status,
      statusText: error?.statusText,
      name: error?.name,
      // Información adicional del API
      apiEndpoint: error?.apiEndpoint,
      apiMethod: error?.apiMethod,
      timestamp: error?.timestamp,
      // Detalles completos para debugging
      details: errorDetails,
      // 🔍 INFORMACIÓN ESPECÍFICA PARA ERRORES 409
      conflictDetails: error?.status === 409 ? {
        originalMessage: error?.originalError?.error,
        userMessage: error?.message,
        hasReservationConflict: errorMessage.includes('reserva') || errorMessage.includes('horario')
      } : undefined
    };
    
    console.error(`🚨 [ERROR-HANDLER] ${context.action}:`, safeErrorInfo);
  }

  /**
   * Maneja el error completo: logging + mensaje de usuario
   */
  static handleError(error: any, context: ErrorContext): string {
    // Log del error para debugging
    this.logError(error, context);
    
    // Retornar mensaje amigable para el usuario
    return this.getUserMessage(error, context);
  }

  /**
   * Determina si el error es recuperable
   */
  static isRecoverable(error: any): boolean {
    if (!error?.message) return false;
    
    const errorMessage = error.message.toLowerCase();
    
    // Errores NO recuperables
    const nonRecoverable = [
      'no autorizado',
      'unauthorized',
      'forbidden',
      'not found',
      'no encontrada',
      'invalid token',
      'expired token'
    ];
    
    return !nonRecoverable.some(term => errorMessage.includes(term));
  }

  /**
   * Sugiere acciones para errores específicos
   */
  static getSuggestedActions(error: any): string[] {
    if (!error?.message) return [];
    
    const errorMessage = error.message.toLowerCase();
    const suggestions: string[] = [];
    
    if (errorMessage.includes('mantenimiento')) {
      suggestions.push('Selecciona otro horario');
      suggestions.push('Selecciona otra cancha');
      suggestions.push('Verifica el calendario de mantenimiento');
    }
    
    if (errorMessage.includes('no disponible')) {
      suggestions.push('Selecciona otro horario');
      suggestions.push('Selecciona otra fecha');
      suggestions.push('Verifica la disponibilidad en tiempo real');
    }
    
    if (errorMessage.includes('usuario ya tiene')) {
      suggestions.push('Revisa tus reservas existentes');
      suggestions.push('Cancela la reserva conflictiva');
      suggestions.push('Selecciona otro horario');
    }
    
    if (errorMessage.includes('no autorizado')) {
      suggestions.push('Inicia sesión nuevamente');
      suggestions.push('Verifica tu cuenta de usuario');
      suggestions.push('Contacta al administrador');
    }
    
    return suggestions;
  }
}
