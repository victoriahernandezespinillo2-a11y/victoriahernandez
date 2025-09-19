/**
 * Validador robusto para órdenes - Centraliza todas las validaciones
 * Este archivo asegura consistencia entre frontend y backend
 * Sigue el mismo patrón que reservation.validator.ts
 */

import { z } from 'zod';

// Estados válidos sincronizados con el esquema de base de datos
export const VALID_ORDER_STATUSES = [
  'PENDING',
  'PAID',
  'FULFILLED',
  'REDEEMED',
  'REFUNDED',
  'CANCELLED'
] as const;

export const VALID_ORDER_PAYMENT_METHODS = [
  'CREDITS',
  'CARD',
  'TRANSFER',
  'CASH'
] as const;

export const VALID_ORDER_TYPES = [
  'ORDER',
  'SUBSCRIPTION',
  'RENEWAL'
] as const;

// Esquemas de validación centralizados
export const OrderStatusSchema = z.enum(VALID_ORDER_STATUSES);

export const OrderPaymentMethodSchema = z.enum(VALID_ORDER_PAYMENT_METHODS);

export const OrderTypeSchema = z.enum(VALID_ORDER_TYPES);

// Esquema para consultas de órdenes
export const OrderQuerySchema = z.object({
  status: OrderStatusSchema.optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  userId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// Esquema para crear órdenes
export const CreateOrderSchema = z.object({
  userId: z.string().min(1, 'userId requerido'),
  items: z.array(z.object({
    productId: z.string().min(1, 'productId requerido'),
    qty: z.number().int().min(1, 'Cantidad debe ser mayor a 0'),
    unitPriceEuro: z.number().positive('Precio debe ser positivo'),
    taxRate: z.number().min(0).max(1).default(0),
    creditsPerUnit: z.number().int().min(0).optional()
  })).min(1, 'Debe incluir al menos un item'),
  paymentMethod: OrderPaymentMethodSchema,
  creditsUsed: z.number().int().min(0).default(0),
  type: OrderTypeSchema.default('ORDER')
});

// Esquema para actualizar órdenes
export const UpdateOrderSchema = z.object({
  status: OrderStatusSchema.optional(),
  redeemedAt: z.string().datetime().optional(),
  notes: z.string().optional()
});

// Tipos exportados
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type OrderPaymentMethod = z.infer<typeof OrderPaymentMethodSchema>;
export type OrderType = z.infer<typeof OrderTypeSchema>;
export type OrderQuery = z.infer<typeof OrderQuerySchema>;
export type CreateOrderData = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderData = z.infer<typeof UpdateOrderSchema>;

// Utilidades de validación
export const validateOrderStatus = (status: string): status is OrderStatus => {
  return VALID_ORDER_STATUSES.includes(status as OrderStatus);
};

export const getValidOrderStatuses = (): readonly OrderStatus[] => {
  return VALID_ORDER_STATUSES;
};



