/**
 * Tipos compartidos para reservas - Sincronizados con el backend
 * Este archivo mantiene la consistencia entre frontend y backend
 */

export type ReservationStatus = 
  | 'PENDING' 
  | 'PAID' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'NO_SHOW';

export type PaymentStatus = 
  | 'PENDING' 
  | 'PAID' 
  | 'REFUNDED';

export interface Reservation {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  courtId: string;
  courtName: string;
  centerName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalAmount: number;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  currentPaymentMethod?: string;
  notes?: string;
  createdAt: string;
}

export interface PaymentConfirmationReservation {
  id: string;
  userName: string;
  courtName: string;
  totalAmount: number;
  currentPaymentMethod?: string;
}

// Mapeo de estados para UI
export const statusColors: Record<ReservationStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-green-100 text-green-800',
  NO_SHOW: 'bg-gray-100 text-gray-800'
};

export const statusLabels: Record<ReservationStatus, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagada',
  IN_PROGRESS: 'En Curso',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
  NO_SHOW: 'No se presentó'
};

export const paymentStatusColors: Record<PaymentStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  REFUNDED: 'bg-blue-100 text-blue-800'
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  REFUNDED: 'Reembolsado'
};

// Función de validación para asegurar consistencia
export function isValidReservationStatus(status: string): status is ReservationStatus {
  return ['PENDING', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(status);
}

export function isValidPaymentStatus(status: string): status is PaymentStatus {
  return ['PENDING', 'PAID', 'REFUNDED'].includes(status);
}













