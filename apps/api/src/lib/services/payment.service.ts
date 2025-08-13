/**
 * Servicio de Pagos
 * Maneja procesamiento de pagos, webhooks y reembolsos
 */

import { z } from 'zod';
import type Stripe from 'stripe';
// El schema actual no define enums de pagos en Prisma; usamos strings
import { db } from '@repo/db';
import { PaymentService as PaymentServiceCore } from '@repo/payments';
import { NotificationService } from '@repo/notifications';

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
          automatic_payment_methods: {
            enabled: true
          }
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
   * Obtener lista de pagos
   */
  async getPayments(params: GetPaymentsData) {
    const validatedParams = GetPaymentsSchema.parse(params);
    const { page, limit, status, userId, provider, dateFrom, dateTo, centerId } = validatedParams;

    const skip = (page - 1) * limit;

    // Intento principal: usar tabla payment si existe
    try {
      const where: any = {};
      if (status) where.status = status;
      if (userId) where.userId = userId;
      if (provider) where.provider = provider;
      if (dateFrom || dateTo) {
        where.createdAt = {} as any;
        if (dateFrom) (where.createdAt as any).gte = new Date(dateFrom);
        if (dateTo) (where.createdAt as any).lte = new Date(dateTo);
      }
      if (centerId) {
        where.OR = [
          { reservation: { court: { centerId } } },
          { membership: { centerId } },
        ];
      }

      const [payments, total] = await Promise.all([
        (prisma as any).payment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            reservation: {
              select: {
                id: true,
                startTime: true,
                endTime: true,
                court: { select: { name: true, center: { select: { name: true } } } },
              },
            },
            membership: { select: { id: true, type: true, startDate: true, endDate: true } },
            refunds: { select: { id: true, amount: true, status: true, createdAt: true } },
          },
        }),
        (prisma as any).payment.count({ where }),
      ]);

      return {
        payments,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      };
    } catch (e) {
      // Fallback: sintetizar pagos a partir de reservas pagadas/completadas
      const whereRes: any = {
        status: { in: ['PAID', 'COMPLETED'] },
      };
      if (userId) whereRes.userId = userId;
      if (dateFrom || dateTo) {
        whereRes.createdAt = {} as any;
        if (dateFrom) (whereRes.createdAt as any).gte = new Date(dateFrom);
        if (dateTo) (whereRes.createdAt as any).lte = new Date(dateTo);
      }
      if (centerId) whereRes.court = { centerId };

      const [reservations, total] = await Promise.all([
        prisma.reservation.findMany({
          where: whereRes,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            totalPrice: true,
            createdAt: true,
            paymentMethod: true,
            status: true,
            user: { select: { id: true, name: true, email: true } },
          },
        }),
        prisma.reservation.count({ where: whereRes }),
      ]);

      const payments = reservations.map((r: any) => ({
        id: r.id,
        amount: Number(r.totalPrice || 0),
        status: (r.status as any) || 'COMPLETED',
        method: r.paymentMethod || 'CARD',
        provider: 'MANUAL',
        createdAt: r.createdAt,
        user: r.user,
        reservationId: r.id,
        membershipId: null,
        refunds: [],
      }));

      return {
        payments,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      };
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
   * Obtener estadísticas de pagos
   */
  async getPaymentStats(centerId?: string) {
    try {
      const where: any = {};
      if (centerId) where.OR = [{ reservation: { court: { centerId } } }, { membership: { centerId } }];
      const [totalRevenue, monthlyRevenue, paymentsByStatus, paymentsByMethod] = await Promise.all([
        (prisma as any).payment.aggregate({ where: { ...where, status: 'COMPLETED' }, _sum: { amount: true } }),
        (prisma as any).payment.aggregate({
          where: { ...where, status: 'COMPLETED', createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
          _sum: { amount: true },
        }),
        (prisma as any).payment.groupBy({ by: ['status'], where, _count: { _all: true }, _sum: { amount: true } }),
        (prisma as any).payment.groupBy({ by: ['method'], where: { ...where, status: 'COMPLETED' }, _count: { _all: true }, _sum: { amount: true } }),
      ]);
      return {
        totalRevenue: totalRevenue._sum.amount || 0,
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
        paymentsByStatus,
        paymentsByMethod,
      };
    } catch {
      // Fallback usando reservas como proxy de pagos
      const whereRes: any = { status: { in: ['PAID', 'COMPLETED'] } };
      if (centerId) whereRes.court = { centerId };
      const [reservationsAll, reservationsMonth, byStatus, byMethod] = await Promise.all([
        prisma.reservation.aggregate({ where: whereRes, _sum: { totalPrice: true } }),
        prisma.reservation.aggregate({
          where: { ...whereRes, createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
          _sum: { totalPrice: true },
        }),
        prisma.reservation.groupBy({ by: ['status'], where: whereRes, _count: { _all: true } }),
        prisma.reservation.groupBy({ by: ['paymentMethod'], where: whereRes, _count: { _all: true } }),
      ]);
      return {
        totalRevenue: Number(reservationsAll._sum.totalPrice || 0),
        monthlyRevenue: Number(reservationsMonth._sum.totalPrice || 0),
        paymentsByStatus: byStatus,
        paymentsByMethod: byMethod.map((m: any) => ({ method: m.paymentMethod, _count: { _all: m._count._all }, _sum: { amount: null } })),
      };
    }
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
            status: 'PAID'
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