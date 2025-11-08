import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { emailService } from '@repo/notifications';

function extractReservationId(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const idx = segments.lastIndexOf('reservations');
  if (idx === -1 || idx + 1 >= segments.length) return '';
  return segments[idx + 1]!;
}

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const reservationId = extractReservationId(req.nextUrl.pathname);
      if (!reservationId) {
        return ApiResponse.badRequest('ID de reserva no encontrado en la ruta');
      }

      const reservation = await db.reservation.findUnique({
        where: { id: reservationId },
        include: {
          user: true,
        },
      });

      if (!reservation) {
        return ApiResponse.notFound('Reserva no encontrada');
      }

      const blockedStatuses = new Set(['PAID', 'COMPLETED', 'CANCELLED']);
      if (blockedStatuses.has((reservation.status as any) || '')) {
        return ApiResponse.badRequest('La reserva no admite envío de enlace en su estado actual');
      }

      const amountDue = Number(reservation.totalPrice || 0);
      if (!(amountDue > 0)) {
        return ApiResponse.badRequest('La reserva no tiene importe pendiente');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const paymentLinkUrl = `${apiUrl}/api/payments/redsys/redirect?rid=${encodeURIComponent(reservation.id)}`;

      const targetEmail = reservation.user?.email;
      if (!targetEmail) {
        return ApiResponse.badRequest('El usuario no tiene email registrado');
      }

      const nameFallback = reservation.user?.name || targetEmail.split('@')[0] || 'Cliente';
      await emailService.sendEmail({
        to: targetEmail,
        subject: 'Enlace de pago de tu reserva',
        html: `<p>Hola ${nameFallback},</p><p>Puedes completar el pago de tu reserva haciendo clic en el siguiente enlace:</p><p><a href="${paymentLinkUrl}">Pagar ahora</a></p>`,
      });

      await db.outboxEvent.create({
        data: {
          eventType: 'PAYMENT_LINK_EMAIL_SENT',
          eventData: {
            reservationId: reservation.id,
            userId: reservation.userId,
            provider: 'redsys',
            url: paymentLinkUrl,
          } as any,
        },
      });

      return ApiResponse.success({ url: paymentLinkUrl });
    } catch (error) {
      console.error('Error enviando enlace de pago manual:', error);
      return ApiResponse.internalError('No se pudo enviar el enlace de pago por correo');
    }
  })(request);
}


