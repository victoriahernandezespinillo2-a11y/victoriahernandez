/**
 * Validador robusto para reservas - Centraliza todas las validaciones
 * Este archivo asegura consistencia entre frontend y backend
 */

import { z } from 'zod';

// Estados válidos sincronizados con el esquema de base de datos
export const VALID_RESERVATION_STATUSES = [
  'PENDING',
  'PAID', 
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW'
] as const;

export const VALID_PAYMENT_STATUSES = [
  'PENDING',
  'PAID',
  'REFUNDED'
] as const;

// Esquemas de validación centralizados
export const ReservationStatusSchema = z.enum(VALID_RESERVATION_STATUSES);

export const PaymentStatusSchema = z.enum(VALID_PAYMENT_STATUSES);

export const CreateReservationSchema = z.object({
  courtId: z.string().min(1, 'courtId requerido'),
  userId: z.string().min(1, 'userId requerido'),
  startTime: z.string().datetime(),
  duration: z.number().min(30).max(480), // 30 minutos a 8 horas
  isRecurring: z.boolean().optional().default(false),
  recurringPattern: z.object({
    frequency: z.enum(['weekly', 'biweekly', 'monthly']),
    daysOfWeek: z.array(z.number().min(1).max(7)),
    endDate: z.string().datetime(),
    exceptions: z.array(z.string().datetime()).optional(),
  }).optional(),
  paymentMethod: z.enum(['stripe', 'redsys', 'credits']).optional(),
  notes: z.string().optional(),
  lightingSelected: z.boolean().optional(),
});

export const UpdateReservationSchema = z.object({
  startTime: z.string().datetime().optional(),
  duration: z.number().min(30).max(480).optional(),
  status: ReservationStatusSchema.optional(),
  notes: z.string().optional(),
});

export const UpdatePaymentSchema = z.object({
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER', 'ONSITE', 'CREDITS', 'BIZUM']),
  paymentStatus: PaymentStatusSchema.optional(),
  notes: z.string().optional(),
  amount: z.number().positive().optional(),
});

// Función de validación con mensajes de error mejorados
export function validateReservationStatus(status: string): { isValid: boolean; error?: string } {
  if (!VALID_RESERVATION_STATUSES.includes(status as any)) {
    return {
      isValid: false,
      error: `Estado de reserva inválido. Estados permitidos: ${VALID_RESERVATION_STATUSES.join(', ')}. Recibido: '${status}'`
    };
  }
  return { isValid: true };
}

export function validatePaymentStatus(status: string): { isValid: boolean; error?: string } {
  if (!VALID_PAYMENT_STATUSES.includes(status as any)) {
    return {
      isValid: false,
      error: `Estado de pago inválido. Estados permitidos: ${VALID_PAYMENT_STATUSES.join(', ')}. Recibido: '${status}'`
    };
  }
  return { isValid: true };
}

// Función para mapear estados legacy (si es necesario)
export function mapLegacyStatus(status: string): string {
  const legacyMappings: Record<string, string> = {
    'CONFIRMED': 'PAID', // Mapear CONFIRMED legacy a PAID
  };
  
  return legacyMappings[status] || status;
}

// Función de validación con mapeo automático
export function validateAndMapReservationStatus(status: string): { 
  isValid: boolean; 
  mappedStatus?: string; 
  error?: string 
} {
  // Primero intentar mapear si es un estado legacy
  const mappedStatus = mapLegacyStatus(status);
  
  // Validar el estado mapeado
  const validation = validateReservationStatus(mappedStatus);
  
  if (!validation.isValid) {
    return validation;
  }
  
  return {
    isValid: true,
    mappedStatus: mappedStatus !== status ? mappedStatus : undefined
  };
}

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
export type UpdateReservationInput = z.infer<typeof UpdateReservationSchema>;
export type UpdatePaymentInput = z.infer<typeof UpdatePaymentSchema>;













