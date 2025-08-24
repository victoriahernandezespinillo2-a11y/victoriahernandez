/**
 * Servicio de validación de pases de acceso
 * Centraliza la lógica de validación de seguridad
 */

import { ReservationStatus, PassValidationResult } from '../../types/reservation.types';
import { 
  VALID_PASS_STATUSES, 
  RESERVATION_STATUS_MESSAGES 
} from '../constants/reservation.constants';

export class PassValidationService {
  /**
   * Valida si una reserva puede generar un pase
   */
  static validateReservationForPass(
    status: ReservationStatus,
    endTime: Date
  ): PassValidationResult {
    // Validar estado de la reserva
    if (!VALID_PASS_STATUSES.includes(status as any)) {
      const message = RESERVATION_STATUS_MESSAGES[status as keyof typeof RESERVATION_STATUS_MESSAGES] || 
                     `No se puede generar pase para reserva en estado: ${status}`;
      
      return {
        isValid: false,
        message,
        statusCode: 400
      };
    }

    // Validar expiración
    if (endTime < new Date()) {
      return {
        isValid: false,
        message: 'No se puede generar pase para reserva expirada',
        statusCode: 410
      };
    }

    return {
      isValid: true,
      statusCode: 200
    };
  }

  /**
   * Valida un token JWT de pase
   */
  static validatePassToken(payload: any): PassValidationResult {
    // Verificar campos requeridos
    if (!payload.reservationId || !payload.uid || !payload.status) {
      return {
        isValid: false,
        message: 'Token de pase inválido: campos faltantes',
        statusCode: 401
      };
    }

    // Verificar estado de la reserva en el token
    if (!VALID_PASS_STATUSES.includes(payload.status)) {
      return {
        isValid: false,
        message: `Token de pase inválido: estado no válido (${payload.status})`,
        statusCode: 401
      };
    }

    // Verificar expiración
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return {
        isValid: false,
        message: 'Token de pase expirado',
        statusCode: 401
      };
    }

    return {
      isValid: true,
      statusCode: 200
    };
  }

  /**
   * Genera log de auditoría para validaciones
   */
  static logValidation(
    reservationId: string,
    status: ReservationStatus,
    userId: string,
    courtId: string,
    isValid: boolean,
    message?: string
  ): void {
    console.log(`🔒 [PASS-VALIDATION] Reserva ${reservationId}:`, {
      status,
      userId,
      courtId,
      isValid,
      message,
      timestamp: new Date().toISOString()
    });
  }
}
