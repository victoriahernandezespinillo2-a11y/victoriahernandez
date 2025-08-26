import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';
import { stripeService } from '@repo/payments';
import { emailService } from '@repo/notifications';

const BodySchema = z.object({
  type: z.enum(['CONFIRMATION', 'PAYMENT_LINK']).default('CONFIRMATION'),
  channel: z.enum(['EMAIL', 'SMS']).optional().default('EMAIL'),
});

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const segments = req.nextUrl.pathname.split('/');
      const ridx = segments.findIndex((s) => s === 'reservations');
      const id = ridx !== -1 && segments[ridx + 1] ? segments[ridx + 1] : '';
      if (!id) return ApiResponse.badRequest('ID de reserva requerido');

      const body = await req.json().catch(() => ({}));
      const { type, channel } = BodySchema.parse(body);

      const reservation = await db.reservation.findUnique({
        where: { id },
        include: { user: true, court: true },
      });
      if (!reservation) return ApiResponse.notFound('Reserva no encontrada');

      if (type === 'PAYMENT_LINK') {
        const amount = Number(reservation.totalPrice || 0);
        const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/dashboard/reservations/success?reservationId=${reservation.id}`;
        const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/dashboard/reservations`;
        const session = await stripeService.createCheckoutSession({
          amount,
          currency: 'eur',
          successUrl,
          cancelUrl,
          metadata: { reservationId: reservation.id },
          description: `Reserva ${reservation.courtId}`,
        });
        const url = session.url || '';
        await db.outboxEvent.create({ data: { eventType: 'PAYMENT_LINK_CREATED', eventData: { reservationId: reservation.id, sessionId: session.id, url } as any } });
        if (channel === 'EMAIL' && reservation.user?.email && url) {
          await emailService.sendEmail({
            to: reservation.user.email,
            subject: 'Enlace de pago de tu reserva',
            html: `<p>Hola ${reservation.user.name || ''},</p><p>Puedes completar el pago de tu reserva haciendo clic en el siguiente enlace:</p><p><a href="${url}">Pagar ahora</a></p>`,
          });
        }
        return ApiResponse.success({ url });
      }

      // CONFIRMATION → encolar evento de confirmación
      await db.outboxEvent.create({
        data: {
          eventType: 'RESERVATION_CONFIRMATION_REQUESTED',
          eventData: { reservationId: reservation.id, userId: reservation.userId, channel } as any,
        },
      });
      return ApiResponse.success({ ok: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(error.errors.map(er => ({ field: er.path.join('.'), message: er.message })));
      }
      console.error('Error al reenviar notificación:', error);
      return ApiResponse.internalError('No se pudo reenviar la notificación');
    }
  })(request, {} as any);
}


