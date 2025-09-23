/**
 * Servicio de Pagos
 * Maneja procesamiento de pagos, webhooks y reembolsos
 */

import { z } from 'zod';
import type Stripe from 'stripe';
// El schema actual no define enums de pagos en Prisma; usamos strings
import { PaymentService as PaymentServiceCore } from '@repo/payments';
import { NotificationService } from '@repo/notifications';
import { db } from '@repo/db';
import { ledgerService } from './ledger.service';

// Usar el cliente Prisma compartido del monorepo
const prisma = db;
const notificationService = new NotificationService();
const paymentCore = new PaymentServiceCore();

// Schemas de validación
export const CreatePaymentSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo'),
  currency: z.string().default('EUR'),
  description: z.string().min(1, 'Descripción requerida'),
  reservationId: z.string().optional(),
  membershipId: z.string().optional(),
  tournamentId: z.string().optional(),
  userId: z.string().min(1, 'ID de usuario requerido'),
  paymentMethod: z.enum(['CARD', 'TRANSFER', 'CASH']).default('CARD'),
  provider: z.enum(['STRIPE', 'REDSYS', 'MANUAL']).default('STRIPE'),
  metadata: z.record(z.string()).optional()
});

export const ProcessPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment Intent ID requerido'),
  paymentMethodId: z.string().optional(),
  confirmationToken: z.string().optional()
});

export const RefundPaymentSchema = z.object({
  paymentId: z.string().min(1, 'ID de pago requerido'),
  amount: z.number().positive().optional(),
  reason: z.string().min(1, 'Razón del reembolso requerida'),
  refundType: z.enum(['FULL', 'PARTIAL']).default('FULL')
});

export const GetPaymentsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED']).optional(),
  userId: z.string().optional(),
  provider: z.enum(['STRIPE', 'REDSYS', 'MANUAL']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  centerId: z.string().optional()
});

// Tipos
export type CreatePaymentData = z.infer<typeof CreatePaymentSchema>;
export type ProcessPaymentData = z.infer<typeof ProcessPaymentSchema>;
export type RefundPaymentData = z.infer<typeof RefundPaymentSchema>;
export type GetPaymentsData = z.infer<typeof GetPaymentsSchema>;

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  transactionId?: string;
  status: string;
  message?: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
  status: string;
  message?: string;
}

export class PaymentService {
  /**
   * Listar métodos de pago del usuario
   */
  async listPaymentMethods(userId: string) {
    try {
      const methods = await (db as any).paymentMethod.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
      return methods;
    } catch (e) {
      return [];
    }
  }

  /**
   * Agregar método de pago (solo metadatos)
   */
  async addPaymentMethod(userId: string, data: { brand: string; last4: string; expMonth: number; expYear: number; holderName?: string; setDefault?: boolean; }) {
    const created = await (db as any).paymentMethod.create({
      data: {
        userId,
        brand: data.brand,
        last4: data.last4,
        expMonth: data.expMonth,
        expYear: data.expYear,
        holderName: data.holderName,
        isDefault: !!data.setDefault,
      },
    });
    if (data.setDefault) {
      await (db as any).paymentMethod.updateMany({ where: { userId, id: { not: created.id } }, data: { isDefault: false } });
    }
    return created;
  }

  /**
   * Eliminar método de pago
   */
  async deletePaymentMethod(userId: string, id: string) {
    await (db as any).paymentMethod.delete({ where: { id } });
    return { success: true };
  }
  /**
   * Crear intención de pago
   */
  async createPaymentIntent(data: CreatePaymentData): Promise<PaymentIntent> {
    const validatedData = CreatePaymentSchema.parse(data);

    try {
      // Crear registro de pago en la base de datos
      const payment = await (prisma as any).payment.create({
        data: {
          amount: validatedData.amount,
          currency: validatedData.currency,
          description: validatedData.description,
          status: 'PENDING',
          method: validatedData.paymentMethod,
          provider: validatedData.provider,
          userId: validatedData.userId,
          reservationId: validatedData.reservationId,
          membershipId: validatedData.membershipId,
          tournamentId: validatedData.tournamentId,
          metadata: validatedData.metadata || {}
        }
      });

      let paymentIntent: any;

      if (validatedData.provider === 'STRIPE') {
        // Crear PaymentIntent en Stripe
        paymentIntent = await paymentCore.createStripePayment({
        amount: validatedData.amount, // El servicio ya maneja la conversión
        currency: validatedData.currency.toLowerCase(),
          description: validatedData.description,
          metadata: {
            paymentId: payment.id,
            userId: validatedData.userId,
            ...validatedData.metadata
          },
        });

        // Actualizar con el ID de Stripe
         await (prisma as any).payment.update({
          where: { id: payment.id },
          data: { 
            externalId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret
          }
        });

        return {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret!,
          amount: validatedData.amount,
          currency: validatedData.currency,
          status: paymentIntent.status
        };
      } else {
        // Para otros proveedores (REDSYS, MANUAL)
        return {
          id: payment.id,
          clientSecret: '',
          amount: validatedData.amount,
          currency: validatedData.currency,
          status: 'requires_payment_method'
        };
      }
    } catch (error) {
      console.error('Error creando intención de pago:', error);
      throw new Error('Error al crear la intención de pago');
    }
  }

  /**
   * Simular pago manual (demo): crea un pago COMPLETED y marca la reserva como PAID
   */
  async simulateManualPayment(data: {
    amount: number;
    currency?: string;
    description: string;
    reservationId?: string;
    membershipId?: string;
    tournamentId?: string;
    userId: string;
    paymentMethod?: 'CARD' | 'TRANSFER' | 'CASH';
  }): Promise<PaymentResult> {
    const amount = Number(data.amount || 0);
    const currency = (data.currency || 'EUR').toUpperCase();
    const method = data.paymentMethod || 'CARD';
    try {
      // Crear el pago ya como COMPLETED (si el modelo payment existe)
      const payment = await (prisma as any).payment.create({
        data: {
          amount,
          currency,
          description: data.description,
          status: 'COMPLETED',
          method,
          provider: 'MANUAL',
          userId: data.userId,
          reservationId: data.reservationId,
          membershipId: data.membershipId,
          tournamentId: data.tournamentId,
          processedAt: new Date(),
          metadata: { demo: true },
        },
      });

      // Efectos colaterales de pago exitoso (marcar reserva como PAID, notificaciones)
      await this.handleSuccessfulPayment(payment);

      return {
        success: true,
        paymentId: payment.id,
        status: 'COMPLETED',
        message: 'Pago demo completado',
      };
    } catch (e) {
      // Fallback: si no existe tabla payment, marcar directamente la reserva como pagada
      if (data.reservationId) {
        await prisma.reservation.update({
          where: { id: data.reservationId },
          data: { status: 'PAID' },
        });
      }
      return {
        success: true,
        paymentId: data.reservationId || 'manual-demo',
        status: 'COMPLETED',
        message: 'Pago demo completado (fallback sin tabla payment)',
      };
    }
  }

  /**
   * Procesar pago
   */
  async processPayment(data: ProcessPaymentData): Promise<PaymentResult> {
    const validatedData = ProcessPaymentSchema.parse(data);

    try {
      // Buscar el pago en la base de datos
      const payment = await (prisma as any).payment.findFirst({
        where: { externalId: validatedData.paymentIntentId }
      });

      if (!payment) {
        throw new Error('Pago no encontrado');
      }

      // Confirmar el pago en Stripe
      const paymentIntent = await paymentCore.confirmStripePayment(
         validatedData.paymentIntentId
       );

      // Actualizar estado del pago
      const updatedPayment = await (prisma as any).payment.update({
        where: { id: payment.id },
        data: {
          status: this.mapStripeStatusToPaymentStatus(paymentIntent.status),
          transactionId: paymentIntent.latest_charge as string || undefined,
          processedAt: paymentIntent.status === 'succeeded' ? new Date() : null
        }
      });

      // Si el pago fue exitoso, procesar las acciones correspondientes
      if (paymentIntent.status === 'succeeded') {
        await this.handleSuccessfulPayment(updatedPayment);
      }

      return {
        success: paymentIntent.status === 'succeeded',
        paymentId: payment.id,
        transactionId: paymentIntent.latest_charge as string,
        status: updatedPayment.status,
        message: paymentIntent.status === 'succeeded' ? 'Pago procesado exitosamente' : 'Pago pendiente'
      };
    } catch (error) {
      console.error('Error procesando pago:', error);
      throw new Error('Error al procesar el pago');
    }
  }

  /**
   * Crear pago directo (alias para createPaymentIntent)
   */
  async createPayment(data: CreatePaymentData): Promise<PaymentIntent> {
    return await this.createPaymentIntent(data);
  }

  /**
   * Obtener estado de pago
   */
  async getPaymentStatus(paymentId: string): Promise<any> {
    const payment = await (prisma as any).payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        reservation: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            court: {
              select: {
                name: true,
                center: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        },
        membership: {
          select: {
            id: true,
            type: true,
            startDate: true,
            endDate: true
          }
        }
      }
    });

    if (!payment) {
      throw new Error('Pago no encontrado');
    }

    return payment;
  }

  /**
   * Procesar reembolso
   */
  async processRefund(data: RefundPaymentData): Promise<RefundResult> {
    const validatedData = RefundPaymentSchema.parse(data);

    try {
      // Buscar el pago
      const payment = await (prisma as any).payment.findUnique({
        where: { id: validatedData.paymentId }
      });

      if (!payment) {
        throw new Error('Pago no encontrado');
      }

      if (payment.status !== 'COMPLETED') {
        throw new Error('Solo se pueden reembolsar pagos completados');
      }

      const refundAmount = validatedData.amount || payment.amount;

      if (refundAmount > payment.amount) {
        throw new Error('El monto del reembolso no puede ser mayor al monto del pago');
      }

      let refund: Stripe.Refund | null = null;

      if (payment.provider === 'STRIPE' && payment.transactionId) {
        // Procesar reembolso en Stripe
        refund = await paymentCore.refundStripePayment(
           payment.transactionId,
           refundAmount // El servicio ya maneja la conversión
         );
      }

      // Crear registro de reembolso
      const refundRecord = await (prisma as any).refund.create({
        data: {
          paymentId: payment.id,
          amount: refundAmount,
          reason: validatedData.reason,
          status: refund ? 'COMPLETED' : 'PENDING',
          externalId: refund?.id,
          processedAt: refund ? new Date() : null
        }
      });

      // Actualizar estado del pago si es reembolso completo
      if (refundAmount === payment.amount) {
        await (prisma as any).payment.update({
          where: { id: payment.id },
          data: { status: 'REFUNDED' }
        });
      }

      // Registrar en Ledger (DEBIT) de forma idempotente
      try {
        let sourceType: 'RESERVATION' | 'ORDER' | 'MEMBERSHIP' | 'OTHER' = 'OTHER';
        let sourceId: string = payment.id as string;
        if (payment.reservationId) { sourceType = 'RESERVATION'; sourceId = payment.reservationId; }
        else if (payment.membershipId) { sourceType = 'MEMBERSHIP'; sourceId = payment.membershipId; }
        // No tenemos orderId en el modelo payment actual; futuros flujos podrán setearlo

        await ledgerService.recordRefund({
          sourceType,
          sourceId,
          amountEuro: refundAmount,
          currency: 'EUR',
          method: (payment.method || 'CARD') as any,
          paidAt: refund ? new Date() : new Date(),
          gatewayRef: refund?.id,
          idempotencyKey: `REFUND:${sourceType}:${sourceId}:${refundRecord.id}`,
          metadata: { paymentId: payment.id }
        });
      } catch (e) {
        console.warn('Ledger recordRefund failed (PAYMENT):', e);
      }

      // Enviar notificación al usuario
      await this.sendRefundNotification(payment, refundAmount);

      return {
        success: true,
        refundId: refundRecord.id,
        amount: refundAmount,
        status: refund?.status || 'pending',
        message: 'Reembolso procesado exitosamente'
      };
    } catch (error) {
      console.error('Error procesando reembolso:', error);
      throw new Error('Error al procesar el reembolso');
    }
  }

  /**
   * Obtener lista unificada de pagos (órdenes + reservas)
   * Arquitectura enterprise que combina múltiples fuentes de datos
   */
  async getPayments(params: GetPaymentsData) {
    const validatedParams = GetPaymentsSchema.parse(params);
    const { page, limit, status, userId, provider, dateFrom, dateTo, centerId } = validatedParams;

    const skip = (page - 1) * limit;

    try {
      // === ESTRATEGIA ENTERPRISE: AGREGACIÓN DE MÚLTIPLES FUENTES ===
      console.log('🏗️ [PAYMENT-SERVICE] Iniciando agregación enterprise de pagos');
      
      const [orderPayments, reservationPayments] = await Promise.all([
        this._getOrderPayments({ validatedParams, skip, limit, status, userId, provider, dateFrom, dateTo, centerId }),
        this._getReservationPayments({ validatedParams, skip, limit, status, userId, provider, dateFrom, dateTo, centerId })
      ]);

      // === UNIFICACIÓN Y ORDENACIÓN ENTERPRISE ===
      const allPayments = [...orderPayments, ...reservationPayments];
      
      // Ordenar por fecha de creación (más reciente primero)
      allPayments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Aplicar paginación sobre el conjunto unificado
      const paginatedPayments = allPayments.slice(skip, skip + limit);
      const total = allPayments.length;

      console.log(`✅ [PAYMENT-SERVICE] Pagos unificados: ${total} total, ${paginatedPayments.length} en página ${page}`);
      console.log(`📊 [PAYMENT-SERVICE] Desglose: ${orderPayments.length} órdenes, ${reservationPayments.length} reservas`);

      return {
        items: paginatedPayments,
        pagination: { 
          page, 
          limit, 
          total, 
          pages: Math.ceil(total / limit),
          breakdown: {
            orders: orderPayments.length,
            reservations: reservationPayments.length
          }
        },
      };
    } catch (error) {
      console.error('❌ [PAYMENT-SERVICE] Error en agregación enterprise:', error);
      throw new Error('Error interno del servidor al obtener pagos');
    }
  }

  /**
   * Obtener pagos de órdenes (tienda online)
   * Método privado para separación de responsabilidades
   */
  private async _getOrderPayments(params: any): Promise<any[]> {
    const { validatedParams, skip, limit, status, userId, provider, dateFrom, dateTo, centerId } = params;
    
    try {
      const where: any = {};
      if (status) where.status = status as any;
      if (userId) where.userId = userId;
      if (provider) where.provider = provider;
      if (dateFrom || dateTo) {
        where.createdAt = {} as any;
        if (dateFrom) (where.createdAt as any).gte = new Date(dateFrom);
        if (dateTo) (where.createdAt as any).lte = new Date(dateTo);
      }

      const orders = await (prisma as any).order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          items: {
            include: {
              product: { select: { name: true, sku: true } }
            }
          }
        },
      });

      return orders.map((order: any) => ({
        id: order.id,
        paymentType: 'ORDER',
        userId: order.userId,
        user: order.user,
        amount: order.totalEuro,
        totalPrice: order.totalEuro,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentIntentId: order.paymentIntentId,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items,
        provider: 'MANUAL',
        currency: 'EUR',
        description: `Pedido ${order.id}`,
        // Metadatos enterprise
        metadata: {
          source: 'orders',
          orderId: order.id,
          itemCount: order.items?.length || 0
        }
      }));
    } catch (error) {
      console.warn('⚠️ [PAYMENT-SERVICE] Error obteniendo órdenes, continuando con reservas:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Obtener pagos de reservas (reservas de canchas)
   * Método privado para separación de responsabilidades
   */
  private async _getReservationPayments(params: any): Promise<any[]> {
    const { validatedParams, skip, limit, status, userId, provider, dateFrom, dateTo, centerId } = params;
    
    try {
      const whereRes: any = {
        status: { in: ['PAID', 'COMPLETED', 'IN_PROGRESS'] },
      };
      
      if (userId) whereRes.userId = userId;
      if (dateFrom || dateTo) {
        whereRes.createdAt = {} as any;
        if (dateFrom) (whereRes.createdAt as any).gte = new Date(dateFrom);
        if (dateTo) (whereRes.createdAt as any).lte = new Date(dateTo);
      }
      if (centerId) whereRes.court = { centerId };

      const reservations = await prisma.reservation.findMany({
        where: whereRes,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          court: { 
            select: { 
              id: true, 
              name: true, 
              center: { select: { id: true, name: true } }
            } 
          }
        },
      });

      return reservations.map((reservation: any) => ({
        id: reservation.id,
        paymentType: 'RESERVATION',
        userId: reservation.userId,
        user: reservation.user,
        amount: Number(reservation.totalPrice || 0),
        totalPrice: Number(reservation.totalPrice || 0),
        status: reservation.status, // Mantener el estado original de la reserva
        paymentMethod: reservation.paymentMethod || 'CARD',
        paymentIntentId: reservation.paymentIntentId,
        createdAt: reservation.createdAt,
        updatedAt: reservation.updatedAt,
        provider: 'MANUAL',
        currency: 'EUR',
        description: `Reserva ${reservation.court?.name || 'Cancha'}`,
        // Metadatos enterprise
        metadata: {
          source: 'reservations',
          reservationId: reservation.id,
          courtName: reservation.court?.name,
          centerName: reservation.court?.center?.name,
          startTime: reservation.startTime,
          endTime: reservation.endTime
        }
      }));
    } catch (error) {
      console.warn('⚠️ [PAYMENT-SERVICE] Error obteniendo reservas:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Manejar webhook de Stripe
   */
  async handleStripeWebhook(payload: string, signature: string): Promise<void> {
    try {
      const event = await paymentCore.processStripeWebhook(payload, signature);
      
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;
        case 'charge.dispute.created':
          await this.handleChargeDispute(event.data.object);
          break;
        default:
          console.log(`Evento no manejado: ${event.type}`);
      }
    } catch (error) {
      console.error('Error manejando webhook de Stripe:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas unificadas de pagos (órdenes + reservas)
   * Arquitectura enterprise con agregación de múltiples fuentes
   */
  async getPaymentStats(centerId?: string) {
    try {
      console.log('📊 [PAYMENT-SERVICE] Calculando estadísticas enterprise unificadas');
      
      // === AGREGACIÓN PARALELA DE MÚLTIPLES FUENTES ===
      const [orderStats, reservationStats] = await Promise.all([
        this._getOrderPaymentStats(centerId),
        this._getReservationPaymentStats(centerId)
      ]);

      // === CONSOLIDACIÓN ENTERPRISE ===
      const totalRevenue = (orderStats.totalRevenue || 0) + (reservationStats.totalRevenue || 0);
      const monthlyRevenue = (orderStats.monthlyRevenue || 0) + (reservationStats.monthlyRevenue || 0);
      
      // Combinar estadísticas por estado
      const combinedStatusStats = this._combineStatusStats(orderStats.statusStats, reservationStats.statusStats);
      const combinedMethodStats = this._combineMethodStats(orderStats.methodStats, reservationStats.methodStats);

      const result = {
        totalRevenue,
        monthlyRevenue,
        paymentsByStatus: combinedStatusStats,
        paymentsByMethod: combinedMethodStats,
        breakdown: {
          orders: {
            totalRevenue: orderStats.totalRevenue || 0,
            monthlyRevenue: orderStats.monthlyRevenue || 0,
            count: orderStats.count || 0
          },
          reservations: {
            totalRevenue: reservationStats.totalRevenue || 0,
            monthlyRevenue: reservationStats.monthlyRevenue || 0,
            count: reservationStats.count || 0
          }
        }
      };

      console.log(`✅ [PAYMENT-SERVICE] Estadísticas calculadas: €${totalRevenue} total, €${monthlyRevenue} mensual`);
      return result;
    } catch (error) {
      console.error('❌ [PAYMENT-SERVICE] Error calculando estadísticas enterprise:', error);
      throw new Error('Error interno del servidor al calcular estadísticas');
    }
  }

  /**
   * Obtener estadísticas de pagos de órdenes
   */
  private async _getOrderPaymentStats(centerId?: string) {
    try {
      const where: any = { status: 'COMPLETED' as any };
      const whereMonth = { 
        ...where, 
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } 
      };

      const [totalRevenue, monthlyRevenue, count, statusStats, methodStats] = await Promise.all([
        (prisma as any).order.aggregate({ where, _sum: { totalEuro: true } }),
        (prisma as any).order.aggregate({ where: whereMonth, _sum: { totalEuro: true } }),
        (prisma as any).order.count({ where }),
        (prisma as any).order.groupBy({ by: ['status'], where, _count: { _all: true }, _sum: { totalEuro: true } }),
        (prisma as any).order.groupBy({ by: ['paymentMethod'], where, _count: { _all: true }, _sum: { totalEuro: true } }),
      ]);

      return {
        totalRevenue: Number(totalRevenue._sum.totalEuro || 0),
        monthlyRevenue: Number(monthlyRevenue._sum.totalEuro || 0),
        count,
        statusStats,
        methodStats
      };
    } catch (error) {
      console.warn('⚠️ [PAYMENT-SERVICE] Error obteniendo estadísticas de órdenes:', error instanceof Error ? error.message : String(error));
      return { totalRevenue: 0, monthlyRevenue: 0, count: 0, statusStats: [], methodStats: [] };
    }
  }

  /**
   * Obtener estadísticas de pagos de reservas
   */
  private async _getReservationPaymentStats(centerId?: string) {
    try {
      const whereRes: any = { status: { in: ['PAID', 'COMPLETED', 'IN_PROGRESS'] } };
      if (centerId) whereRes.court = { centerId };
      
      const whereMonth = { 
        ...whereRes, 
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } 
      };

      const [totalRevenue, monthlyRevenue, count, statusStats, methodStats] = await Promise.all([
        prisma.reservation.aggregate({ where: whereRes, _sum: { totalPrice: true } }),
        prisma.reservation.aggregate({ where: whereMonth, _sum: { totalPrice: true } }),
        prisma.reservation.count({ where: whereRes }),
        prisma.reservation.groupBy({ by: ['status'], where: whereRes, _count: { _all: true } }),
        prisma.reservation.groupBy({ by: ['paymentMethod'], where: whereRes, _count: { _all: true } }),
      ]);

      return {
        totalRevenue: Number(totalRevenue._sum.totalPrice || 0),
        monthlyRevenue: Number(monthlyRevenue._sum.totalPrice || 0),
        count,
        statusStats: statusStats.map((s: any) => ({ 
          status: s.status, // Mantener el estado original
          _count: s._count, 
          _sum: { amount: null } 
        })),
        methodStats: methodStats.map((m: any) => ({ 
          method: m.paymentMethod, 
          _count: m._count, 
          _sum: { amount: null } 
        }))
      };
    } catch (error) {
      console.warn('⚠️ [PAYMENT-SERVICE] Error obteniendo estadísticas de reservas:', error instanceof Error ? error.message : String(error));
      return { totalRevenue: 0, monthlyRevenue: 0, count: 0, statusStats: [], methodStats: [] };
    }
  }

  /**
   * Combinar estadísticas por estado de diferentes fuentes
   */
  private _combineStatusStats(orderStats: any[], reservationStats: any[]) {
    const combined = new Map();
    
    // Agregar estadísticas de órdenes
    orderStats.forEach(stat => {
      combined.set(stat.status, {
        status: stat.status,
        _count: { _all: stat._count._all },
        _sum: { amount: stat._sum.totalEuro || 0 }
      });
    });
    
    // Agregar/combinar estadísticas de reservas
    reservationStats.forEach(stat => {
      const existing = combined.get(stat.status);
      if (existing) {
        existing._count._all += stat._count._all;
      } else {
        combined.set(stat.status, {
          status: stat.status,
          _count: { _all: stat._count._all },
          _sum: { amount: 0 }
        });
      }
    });
    
    return Array.from(combined.values());
  }

  /**
   * Combinar estadísticas por método de diferentes fuentes
   */
  private _combineMethodStats(orderStats: any[], reservationStats: any[]) {
    const combined = new Map();
    
    // Agregar estadísticas de órdenes
    orderStats.forEach(stat => {
      combined.set(stat.method, {
        method: stat.method,
        _count: { _all: stat._count._all },
        _sum: { amount: stat._sum.totalEuro || 0 }
      });
    });
    
    // Agregar/combinar estadísticas de reservas
    reservationStats.forEach(stat => {
      const existing = combined.get(stat.method);
      if (existing) {
        existing._count._all += stat._count._all;
      } else {
        combined.set(stat.method, {
          method: stat.method,
          _count: { _all: stat._count._all },
          _sum: { amount: 0 }
        });
      }
    });
    
    return Array.from(combined.values());
  }

  /**
   * Mapear estado de Stripe a estado de pago
   */
  private mapStripeStatusToPaymentStatus(stripeStatus: string): string {
    switch (stripeStatus) {
      case 'succeeded':
        return 'COMPLETED';
      case 'processing':
        return 'PROCESSING';
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return 'PENDING';
      case 'canceled':
        return 'CANCELLED';
      default:
        return 'FAILED';
    }
  }

  /**
   * Manejar pago exitoso
   */
  private async handleSuccessfulPayment(payment: any): Promise<void> {
    try {
      // Confirmar reserva si existe
      if (payment.reservationId) {
        await prisma.reservation.update({
          where: { id: payment.reservationId },
          data: { 
            paymentStatus: 'PAID', 
            status: 'PAID',  // Sincronizar estado operativo
            paidAt: new Date() 
          }
        });
      }

      // Activar membresía si existe
      if (payment.membershipId) {
        await prisma.membership.update({
          where: { id: payment.membershipId },
          data: { 
            status: 'ACTIVE',
            // activatedAt no existe en el schema actual
          }
        });
      }

      // Enviar notificación de pago exitoso
      await this.sendPaymentSuccessNotification(payment);
    } catch (error) {
      console.error('Error manejando pago exitoso:', error);
    }
  }

  /**
   * Manejar Payment Intent exitoso
   */
  private async handlePaymentIntentSucceeded(paymentIntent: any): Promise<void> {
    const payment = await (prisma as any).payment.findFirst({
      where: { externalId: paymentIntent.id }
    });

    if (payment) {
      await (prisma as any).payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          transactionId: paymentIntent.latest_charge as string,
          processedAt: new Date()
        }
      });

      await this.handleSuccessfulPayment(payment);
    }
  }

  /**
   * Manejar Payment Intent fallido
   */
  private async handlePaymentIntentFailed(paymentIntent: any): Promise<void> {
    const payment = await (prisma as any).payment.findFirst({
      where: { externalId: paymentIntent.id }
    });

    if (payment) {
      await (prisma as any).payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureReason: paymentIntent.last_payment_error?.message
        }
      });

      // Enviar notificación de pago fallido
      await this.sendPaymentFailedNotification(payment);
    }
  }

  /**
   * Manejar disputa de cargo
   */
  private async handleChargeDispute(dispute: any): Promise<void> {
    // Buscar el pago relacionado
    const payment = await (prisma as any).payment.findFirst({
      where: { transactionId: dispute.charge }
    });

    if (payment) {
      // Crear registro de disputa
      await (prisma as any).dispute.create({
        data: {
          paymentId: payment.id,
          externalId: dispute.id,
          amount: dispute.amount / 100, // Convertir de centavos
          reason: dispute.reason,
          status: dispute.status.toUpperCase(),
          evidence: dispute.evidence
        }
      });

      // Notificar al equipo de administración
      await this.sendDisputeNotification(payment, dispute);
    }
  }

  /**
   * Enviar notificación de pago exitoso
   */
  private async sendPaymentSuccessNotification(payment: any): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: payment.userId },
        select: { email: true, firstName: true, lastName: true },
      });
      if (user?.email) {
        await notificationService.sendEmail({
          to: user.email,
          subject: 'Pago procesado exitosamente',
          html: `<p>Hola ${user.firstName ?? ''},</p><p>Tu pago de €${payment.amount} ha sido procesado correctamente.</p><p>ID de pago: ${payment.id}</p>`,
        });
      }
    } catch (error) {
      console.error('Error enviando notificación de pago exitoso:', error);
    }
  }

  /**
   * Enviar notificación de pago fallido
   */
  private async sendPaymentFailedNotification(payment: any): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: payment.userId },
        select: { email: true, firstName: true, lastName: true },
      });
      if (user?.email) {
        await notificationService.sendEmail({
          to: user.email,
          subject: 'Error en el pago',
          html: `<p>Hola ${user.firstName ?? ''},</p><p>Hubo un problema procesando tu pago de €${payment.amount}. Por favor, intenta nuevamente.</p><p>ID de pago: ${payment.id}</p>`,
        });
      }
    } catch (error) {
      console.error('Error enviando notificación de pago fallido:', error);
    }
  }

  /**
   * Enviar notificación de reembolso
   */
  private async sendRefundNotification(payment: any, refundAmount: number): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: payment.userId },
        select: { email: true, firstName: true, lastName: true },
      });
      if (user?.email) {
        await notificationService.sendEmail({
          to: user.email,
          subject: 'Reembolso procesado',
          html: `<p>Hola ${user.firstName ?? ''},</p><p>Se ha procesado un reembolso de €${refundAmount} para tu pago.</p><p>ID de pago: ${payment.id}</p>`,
        });
      }
    } catch (error) {
      console.error('Error enviando notificación de reembolso:', error);
    }
  }

  /**
   * Enviar notificación de disputa
   */
  private async sendDisputeNotification(payment: any, dispute: any): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: payment.userId },
        select: { email: true, firstName: true, lastName: true },
      });
      if (user?.email) {
        await notificationService.sendEmail({
          to: user.email,
          subject: 'Disputa de pago creada',
          html: `<p>Hola ${user.firstName ?? ''},</p><p>Se ha registrado una disputa para tu pago ${payment.id} por €${(dispute.amount / 100).toFixed(2)}.</p><p>Motivo: ${dispute.reason}</p>`,
        });
      }
    } catch (error) {
      console.error('Error enviando notificación de disputa:', error);
    }
  }
}

export default PaymentService;
