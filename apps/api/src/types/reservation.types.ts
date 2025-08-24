/**
 * Tipos para el sistema de reservas
 * Mejora la tipificación y seguridad del código
 */

export type ReservationStatus = 
  | 'PENDING'
  | 'PAID'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type ValidPassStatus = 'PAID' | 'IN_PROGRESS';

export interface PassValidationResult {
  isValid: boolean;
  message?: string;
  statusCode: number;
}

export interface ReservationPassData {
  reservationId: string;
  uid: string;
  status: ReservationStatus;
  startTime: string;
  endTime: string;
  validatedAt: string;
  exp: number;
}
