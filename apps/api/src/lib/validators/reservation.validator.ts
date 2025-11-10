/**
 * Validador robusto para reservas - Centraliza todas las validaciones
 * Este archivo asegura consistencia entre frontend y backend
 */

import { z } from 'zod';

// ============================================
// CONSTANTES DE CONFIGURACIÓN CENTRALIZADAS
// ============================================

/**
 * Porcentaje máximo permitido para override de precios
 * Esta constante debe ser usada tanto en frontend como backend
 * para garantizar validación consistente
 */
export const MAX_OVERRIDE_PERCENT = 20;

/**
 * Límites absolutos para override de precios (en euros)
 * Protección adicional contra valores extremos
 */
export const MAX_OVERRIDE_ABSOLUTE = 100000;
export const MIN_OVERRIDE_ABSOLUTE = -100000;

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

// Métodos de pago válidos - CENTRALIZADO para consistencia
export const VALID_PAYMENT_METHODS = [
  'CASH',
  'TPV',
  'TRANSFER',
  'CREDITS',
  'COURTESY',
  'LINK',
  'PENDING',
  'CARD',
  'ONSITE',
  'BIZUM',
  'stripe',
  'redsys',
  'credits'
] as const;

// Métodos de pago para reservas manuales de admin
export const VALID_ADMIN_PAYMENT_METHODS = [
  'CASH',
  'TPV',
  'TRANSFER',
  'CREDITS',
  'COURTESY',
  'LINK',
  'PENDING'
] as const;
// Métodos de pago para reservas de usuarios
export const VALID_USER_PAYMENT_METHODS = [
  'stripe',
  'redsys',
  'credits',
  'CREDITS',
  'CARD'
] as const;

// Esquemas de validación centralizados
export const ReservationStatusSchema = z.enum(VALID_RESERVATION_STATUSES);

export const PaymentStatusSchema = z.enum(VALID_PAYMENT_STATUSES);

export const PaymentMethodSchema = z.enum(VALID_PAYMENT_METHODS);

export const AdminPaymentMethodSchema = z.enum(VALID_ADMIN_PAYMENT_METHODS);

export const UserPaymentMethodSchema = z.enum(VALID_USER_PAYMENT_METHODS);

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
  paymentMethod: UserPaymentMethodSchema.optional(),
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
  paymentMethod: PaymentMethodSchema,
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

// ============================================
// VALIDACIÓN DE OVERRIDE DE PRECIOS
// ============================================

/**
 * Valida que un override de precio esté dentro de los límites permitidos
 * @param overrideAmount Monto del override (puede ser positivo o negativo)
 * @param basePrice Precio base de la reserva
 * @returns Objeto con resultado de validación y mensaje de error si aplica
 */
export function validatePriceOverride(
  overrideAmount: number,
  basePrice: number
): { 
  isValid: boolean; 
  error?: string;
  details?: {
    overrideAmount: number;
    basePrice: number;
    maxAllowed: number;
    percentageApplied: number;
  }
} {
  // Validar que los valores sean números finitos
  if (!Number.isFinite(overrideAmount) || !Number.isFinite(basePrice)) {
    return {
      isValid: false,
      error: 'Los valores de override y precio base deben ser números válidos'
    };
  }

  // Validar límites absolutos
  if (overrideAmount > MAX_OVERRIDE_ABSOLUTE || overrideAmount < MIN_OVERRIDE_ABSOLUTE) {
    return {
      isValid: false,
      error: `El override debe estar entre ${MIN_OVERRIDE_ABSOLUTE}€ y ${MAX_OVERRIDE_ABSOLUTE}€`
    };
  }

  // Validar límite porcentual
  const maxAllowed = (basePrice * MAX_OVERRIDE_PERCENT) / 100;
  const absoluteOverride = Math.abs(overrideAmount);
  
  if (absoluteOverride > maxAllowed) {
    const percentageApplied = (absoluteOverride / basePrice) * 100;
    return {
      isValid: false,
      error: `El override de ${overrideAmount.toFixed(2)}€ (${percentageApplied.toFixed(1)}%) excede el límite permitido de ${MAX_OVERRIDE_PERCENT}% (${maxAllowed.toFixed(2)}€)`,
      details: {
        overrideAmount,
        basePrice,
        maxAllowed,
        percentageApplied
      }
    };
  }

  return { 
    isValid: true,
    details: {
      overrideAmount,
      basePrice,
      maxAllowed,
      percentageApplied: (absoluteOverride / basePrice) * 100
    }
  };
}

/**
 * Esquema de validación para override de precios
 * Incluye validación de límites y razón obligatoria
 */
export const PricingOverrideSchema = z.object({
  amount: z.number()
    .min(MIN_OVERRIDE_ABSOLUTE, `El override no puede ser menor a ${MIN_OVERRIDE_ABSOLUTE}€`)
    .max(MAX_OVERRIDE_ABSOLUTE, `El override no puede ser mayor a ${MAX_OVERRIDE_ABSOLUTE}€`),
  reason: z.string()
    .min(5, 'La razón del override debe tener al menos 5 caracteres')
    .max(500, 'La razón del override no puede exceder 500 caracteres'),
});




















