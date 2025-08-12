import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { paymentService } from '@repo/payments';
import { z } from 'zod';

const Schema = z.object({
  reservationId: z.string(),
  provider: z.enum(['stripe']).default('stripe'),
});

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const body = await req.json();
      const { reservationId } = Schema.parse(body);
      const reservation = await db.reservation.findUnique({ where: { id: reservationId }, include: { user: true, court: true } });
      if (!reservation) return ApiResponse.notFound('Reserva');

      const amount = Number(reservation.totalPrice || 0);
      const metadata = { reservationId: reservation.id } as Record<string, string>;
      const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/payments/success?rid=${reservation.id}`;
      const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/payments/cancel?rid=${reservation.id}`;

      const session = await paymentService.createStripePayment({
        amount,
        currency: 'eur',
        metadata,
        description: `Reserva ${reservation.court?.name}`,
        customerId: undefined,
      }).catch(async () => {
        // Fallback a Checkout Session
        return await (await import('@repo/payments')).stripeService.createCheckoutSession({
          amount,
          currency: 'eur',
          successUrl,
          cancelUrl,
          metadata,
          description: `Reserva ${reservation.court?.name}`,
        });
      });

      // Nota: Si se creó PaymentIntent, no hay url; para la interfaz preferimos Checkout Session
      const checkout = await (await import('@repo/payments')).stripeService.createCheckoutSession({
        amount,
        currency: 'eur',
        successUrl,
        cancelUrl,
        metadata,
        description: `Reserva ${reservation.court?.name}`,
      });

      // Guardar relación básica
      await db.outboxEvent.create({ data: { eventType: 'PAYMENT_LINK_CREATED', eventData: { reservationId: reservation.id, sessionId: checkout.id } as any } });

      return ApiResponse.success({ url: checkout.url });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return ApiResponse.validation(e.errors.map(er => ({ field: er.path.join('.'), message: er.message })));
      }
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request, {} as any);
}




