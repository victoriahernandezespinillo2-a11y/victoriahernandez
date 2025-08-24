/**
 * Constantes para el sistema de reservas
 * Centraliza mensajes, estados y configuraciones
 */

export const RESERVATION_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW'
} as const;

export const RESERVATION_STATUS_MESSAGES = {
  [RESERVATION_STATUS.PENDING]: 'No se puede generar pase para reserva pendiente de pago',
  [RESERVATION_STATUS.CANCELLED]: 'No se puede generar pase para reserva cancelada',
  [RESERVATION_STATUS.COMPLETED]: 'No se puede generar pase para reserva completada',
  [RESERVATION_STATUS.NO_SHOW]: 'No se puede generar pase para reserva sin presentación'
} as const;

export const VALID_PASS_STATUSES = [
  RESERVATION_STATUS.PAID,
  RESERVATION_STATUS.IN_PROGRESS
] as const;

export const RESERVATION_STATUS_LABELS = {
  [RESERVATION_STATUS.PAID]: 'RESERVA PAGADA',
  [RESERVATION_STATUS.IN_PROGRESS]: 'EN PROGRESO'
} as const;

export const PASS_EXPIRATION_BUFFER_HOURS = 1; // 1 hora después del fin de la reserva
