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

      const reservation = await db.reservation.findUnique({ where: { id } });
      if (!reservation) return ApiResponse.notFound('Reserva no encontrada');
      if (reservation.status !== 'IN_PROGRESS') {
        return ApiResponse.badRequest('La reserva no está en curso');
      }

      const now = new Date();
      await db.reservation.update({ where: { id }, data: { status: 'COMPLETED' as any, checkOutTime: now } });
      await db.outboxEvent.create({ data: { eventType: 'RESERVATION_CHECKED_OUT', eventData: { reservationId: id, at: now.toISOString() } as any } });

      return ApiResponse.success({ ok: true });
    } catch (error) {
      console.error('Admin check-out error:', error);
      return ApiResponse.internalError('Error realizando check-out');
    }
  })(request);
}


