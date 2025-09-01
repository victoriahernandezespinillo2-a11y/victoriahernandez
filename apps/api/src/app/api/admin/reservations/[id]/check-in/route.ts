import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const segments = req.nextUrl.pathname.split('/');
      const ridx = segments.findIndex((s) => s === 'reservations');
      const id = ridx !== -1 && segments[ridx + 1] ? segments[ridx + 1] : '';
      if (!id) return ApiResponse.badRequest('ID de reserva requerido');

      const reservation = await db.reservation.findUnique({
        where: { id },
        include: { court: { include: { center: true } } },
      });
      if (!reservation) return ApiResponse.notFound('Reserva no encontrada');

      // Validación de ventana de check-in
      const now = new Date();
      const start = new Date(reservation.startTime);
      const end = new Date(reservation.endTime);
      const settings: any = (reservation.court.center as any).settings || {};
      const tolMin = Number(settings?.checkin?.toleranceMinutes ?? 30);
      const openFrom = new Date(start.getTime() - tolMin * 60000);
      const openUntil = new Date(end.getTime());
      if (now < openFrom || now > openUntil) {
        return ApiResponse.badRequest('Fuera de ventana de check-in');
      }

      if (reservation.status === 'IN_PROGRESS' || reservation.status === 'COMPLETED') {
        return ApiResponse.badRequest('La reserva ya está en curso o completada');
      }

      await db.reservation.update({ where: { id: reservation.id }, data: { status: 'IN_PROGRESS' as any, checkInTime: now } });
      await db.outboxEvent.create({ data: { eventType: 'RESERVATION_CHECKED_IN', eventData: { reservationId: reservation.id, at: now.toISOString() } as any } });

      return ApiResponse.success({ ok: true });
    } catch (error) {
      console.error('Admin check-in error:', error);
      return ApiResponse.internalError('Error realizando check-in');
    }
  })(request);
}


