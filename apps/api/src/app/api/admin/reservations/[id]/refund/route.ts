import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';
import { stripeService } from '@repo/payments';
import { ledgerService } from '@/lib/services/ledger.service';
import { walletService } from '@/lib/services/wallet.service';

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

      const reservation = await db.reservation.findUnique({ 
        where: { id },
        include: { court: { include: { center: true } } }
      });
      if (!reservation) return ApiResponse.notFound('Reserva no encontrada');

      const paymentIntentId = (reservation as any).paymentIntentId as string | null;
      const paymentMethod = (reservation as any).paymentMethod as string;
      
      let refund: any = null;
      let creditsToRefund = 0;

      // ✅ CORREGIDO: Manejar reembolsos de créditos
      if (paymentMethod === 'CREDITS') {
        // Calcular créditos a reembolsar
        const settings: any = (reservation.court?.center as any)?.settings || {};
        const creditsCfg: any = settings.credits || {};
        const euroPerCredit = typeof creditsCfg.euroPerCredit === 'number' && creditsCfg.euroPerCredit > 0 
          ? creditsCfg.euroPerCredit 
          : 1;
        
        const amount = Number(input.amount || reservation.totalPrice || 0);
        creditsToRefund = amount / euroPerCredit; // NO redondear, usar valor exacto

        // Reembolsar créditos al usuario
        await walletService.refundCredits({
          userId: reservation.userId,
          credits: creditsToRefund,
          reason: 'REFUND' as any,
          metadata: { reservationId: reservation.id, refundReason: input.reason },
          idempotencyKey: `REFUND_CREDITS:RES:${reservation.id}`
        });
      } else if (paymentIntentId) {
        // Reembolso tradicional con Stripe
        refund = await stripeService.createRefund({
          paymentIntentId,
          amount: input.amount,
          reason: 'requested_by_customer',
        });
      } else {
        return ApiResponse.badRequest('La reserva no tiene un método de pago válido para reembolsar');
      }

      // Registrar evento en outbox para que el front muestre estado "REFUNDED"
      await db.outboxEvent.create({
        data: {
          eventType: 'RESERVATION_REFUNDED',
          eventData: {
            reservationId: reservation.id,
            paymentIntentId,
            refundId: refund?.id || null,
            amount: input.amount || Number(reservation.totalPrice || 0),
            reason: input.reason,
            creditsRefunded: creditsToRefund,
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
          method: paymentMethod === 'CREDITS' ? 'CREDITS' : 'CARD',
          paidAt: new Date(),
          gatewayRef: refund?.id || null,
          idempotencyKey: `REFUND:RES:${reservation.id}:${refund?.id || 'credits'}`,
          metadata: { 
            provider: paymentMethod === 'CREDITS' ? 'CREDITS' : 'STRIPE',
            creditsRefunded: creditsToRefund
          }
        });
      } catch (e) {
        console.warn('Ledger recordRefund failed (ADMIN RESERVATION):', e);
      }

      return ApiResponse.success({ 
        refundId: refund?.id || null, 
        status: refund?.status || 'completed',
        creditsRefunded: creditsToRefund
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(error.errors.map(er => ({ field: er.path.join('.'), message: er.message })));
      }
      console.error('Error al reembolsar reserva:', error);
      return ApiResponse.internalError('No se pudo procesar el reembolso');
    }
  })(request);
}




