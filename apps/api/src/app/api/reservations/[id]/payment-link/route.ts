import { NextRequest } from 'next/server';
import { auth } from '@repo/auth';
import { db } from '@repo/db';
import { stripeService } from '@repo/payments';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }
  try {
    const id = request.nextUrl.pathname.split('/').slice(-2, -1)[0];
    if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
    const reservation = await db.reservation.findUnique({ where: { id }, include: { user: true, court: true } });
    if (!reservation || reservation.userId !== session.user.id) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }
    const amount = Number(reservation.totalPrice || 0);
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/payments/success?rid=${reservation.id}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/payments/cancel?rid=${reservation.id}`;
    const checkout = await stripeService.createCheckoutSession({
      amount,
      currency: 'eur',
      successUrl,
      cancelUrl,
      metadata: { reservationId: reservation.id },
      description: `Reserva ${reservation.court?.name}`,
    });
    return new Response(JSON.stringify({ url: checkout.url }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500 });
  }
}




