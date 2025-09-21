import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';
import { stripeService } from '@repo/payments';
import { ledgerService } from '@/lib/services/ledger.service';

const RefundSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().min(3, 'La razón es requerida'),
});

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const { pathname } = req.nextUrl;
      const id = pathname.split('/').slice(-2, -1)[0];
      if (!id) return ApiResponse.badRequest('ID de reserva requerido');

      const body = await req.json().catch(() => ({}));
      const input = RefundSchema.parse(body);

      const reservation = await db.reservation.findUnique({ where: { id } });
      if (!reservation) return ApiResponse.notFound('Reserva no encontrada');

      // Solo se puede reembolsar si tenemos un PaymentIntent (Stripe)
      const paymentIntentId = (reservation as any).paymentIntentId as string | null;
      if (!paymentIntentId) return ApiResponse.badRequest('La reserva no tiene un pago procesado por Stripe');

      // Crear reembolso en Stripe
      const refund = await stripeService.createRefund({
        paymentIntentId,
        amount: input.amount,
        reason: 'requested_by_customer',
      });

      // Registrar evento en outbox para que el front muestre estado "REFUNDED"
      await db.outboxEvent.create({
        data: {
          eventType: 'RESERVATION_REFUNDED',
          eventData: {
            reservationId: reservation.id,
            paymentIntentId,
            refundId: refund.id,
            amount: input.amount || Number(reservation.totalPrice || 0),
            reason: input.reason,
          } as any,
        },
      });

      // Registrar reembolso en ledger (idempotente)
      try {
        await ledgerService.recordRefund({
          sourceType: 'RESERVATION',
          sourceId: reservation.id,
          amountEuro: input.amount || Number(reservation.totalPrice || 0),
          currency: 'EUR',
          method: 'CARD',
          paidAt: new Date(),
          gatewayRef: refund.id,
          idempotencyKey: `REFUND:RES:${reservation.id}:${refund.id}`,
          metadata: { provider: 'STRIPE' }
        });
      } catch (e) {
        console.warn('Ledger recordRefund failed (ADMIN RESERVATION):', e);
      }

      return ApiResponse.success({ refundId: refund.id, status: refund.status });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(error.errors.map(er => ({ field: er.path.join('.'), message: er.message })));
      }
      console.error('Error al reembolsar reserva:', error);
      return ApiResponse.internalError('No se pudo procesar el reembolso');
    }
  })(request);
}




