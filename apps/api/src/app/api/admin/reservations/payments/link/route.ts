import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
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
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

      // Construimos una URL hacia una ruta que auto-envía el formulario a Redsys
      const redirectUrl = `${apiUrl}/api/payments/redsys/redirect?rid=${encodeURIComponent(reservation.id)}`;

      // Guardar relación básica/event log
      await db.outboxEvent.create({
        data: {
          eventType: 'PAYMENT_LINK_CREATED',
          eventData: {
            reservationId: reservation.id,
            provider: 'redsys',
            amount,
            url: redirectUrl,
            successUrl: `${appUrl}/dashboard/reservations/success?reservationId=${reservation.id}`,
            cancelUrl: `${appUrl}/dashboard/reservations`,
          } as any,
        },
      });

      return ApiResponse.success({ url: redirectUrl });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return ApiResponse.validation(e.errors.map(er => ({ field: er.path.join('.'), message: er.message })));
      }
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request, {} as any);
}




