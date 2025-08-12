import { NextRequest } from 'next/server';
import { paymentService, STRIPE_EVENTS } from '@repo/payments';
import { db } from '@repo/db';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature') || '';
    const event = await paymentService.processStripeWebhook(payload, signature);

    // Conciliación de pagos
    if (event.type === STRIPE_EVENTS.PAYMENT_INTENT_SUCCEEDED) {
      const pi: any = event.data.object;
      const reservationId = pi?.metadata?.reservationId as string | undefined;
      if (reservationId) {
        await db.reservation.update({ where: { id: reservationId }, data: { status: 'PAID' } });
        await db.outboxEvent.create({ data: { eventType: 'RESERVATION_PAID', eventData: { reservationId, paymentIntentId: pi.id } as any } });
      }
    }

    return new Response(null, { status: 200 });
  } catch (e) {
    return new Response('Webhook error', { status: 400 });
  }
}




