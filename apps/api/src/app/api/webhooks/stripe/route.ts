import { NextRequest } from 'next/server';
import { paymentService, STRIPE_EVENTS } from '@repo/payments';
import { db } from '@repo/db';
import { walletService } from '../../../../lib/services/wallet.service';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature') || '';
    const event = await paymentService.processStripeWebhook(payload, signature);

    // Conciliación de pagos
    if (event.type === STRIPE_EVENTS.PAYMENT_INTENT_SUCCEEDED) {
      const pi: any = event.data.object;
      const reservationId = pi?.metadata?.reservationId as string | undefined;
      const topupType = pi?.metadata?.type as string | undefined;
      const userId = pi?.metadata?.userId as string | undefined;
      const shopOrderId = pi?.metadata?.orderId as string | undefined;

      if (reservationId) {
        await db.reservation.update({ where: { id: reservationId }, data: { status: 'PAID' } });
        await db.outboxEvent.create({ data: { eventType: 'RESERVATION_PAID', eventData: { reservationId, paymentIntentId: pi.id } as any } });
      }

      // Recarga de monedero (wallet_topup)
      if (topupType === 'wallet_topup' && userId) {
        const creditsRaw = pi?.metadata?.credits as string | undefined;
        const credits = Math.max(1, Math.floor(Number(creditsRaw || '0')));
        try {
          await walletService.credit({
            userId,
            credits,
            reason: 'TOPUP',
            metadata: { paymentIntentId: pi.id },
            idempotencyKey: pi.id, // evitar duplicados ante reintentos
          });
          await db.outboxEvent.create({ data: { eventType: 'WALLET_TOPUP_CREDITED', eventData: { userId, credits, paymentIntentId: pi.id } as any } });
        } catch (e) {
          // idempotente: si ya existe, ignorar
        }
      }

      // Pedido tienda pagado por tarjeta
      if (topupType === 'shop_order' && shopOrderId) {
        try {
          await db.order.update({ where: { id: shopOrderId }, data: { status: 'PAID' } });
          await db.outboxEvent.create({ data: { eventType: 'ORDER_PAID', eventData: { orderId: shopOrderId, method: 'CARD', paymentIntentId: pi.id } as any } });
        } catch {}
      }
    }

    return new Response(null, { status: 200 });
  } catch (e) {
    return new Response('Webhook error', { status: 400 });
  }
}




