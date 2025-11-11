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
  [RESERVATION_STATUS.PENDING]: 'Para generar tu pase de acceso, primero debes completar el pago de la reserva.',
  [RESERVATION_STATUS.CANCELLED]: 'No es posible generar un pase de acceso para reservas canceladas.',
  [RESERVATION_STATUS.COMPLETED]: 'El pase de acceso ya no está disponible para reservas completadas.',
  [RESERVATION_STATUS.NO_SHOW]: 'No es posible generar un pase de acceso para reservas donde no te presentaste.',
  [RESERVATION_STATUS.IN_PROGRESS]: 'Esta reserva ya fue utilizada. El pase de acceso no está disponible para reservas que ya fueron canjeadas.'
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
export const NON_EXPIRABLE_PAYMENT_METHODS = ['PENDING', 'COURTESY', 'TRANSFER', 'ONSITE'] as const;
