/**
 * POST /api/reservations/release-conflicts
 * Libera reservas PENDING del usuario que se solapan con un rango horario
 */

import { NextRequest } from 'next/server';
import { db } from '@repo/db';
import { withReservationMiddleware, ApiResponse } from '@/lib/middleware';
import { NON_EXPIRABLE_PAYMENT_METHODS } from '@/lib/constants/reservation.constants';

export async function POST(request: NextRequest) {
  return withReservationMiddleware(async (req) => {
    try {
      const user = (req as any).user as { id: string } | undefined;
      if (!user?.id) return ApiResponse.unauthorized('Usuario no autenticado');

      const body = await req.json().catch(() => ({}));
      const courtId = body?.courtId as string | undefined;
      const start = body?.startTime ? new Date(body.startTime) : undefined;
      const end = body?.endTime ? new Date(body.endTime) : undefined;

      if (!courtId || !start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return ApiResponse.error('Parámetros inválidos', 400, { courtId, startTime: body?.startTime, endTime: body?.endTime });
      }

      // Buscar reservas PENDING del usuario que se solapan en el mismo court
      const candidates = await db.reservation.findMany({
        where: {
          userId: user.id,
          courtId,
          status: 'PENDING' as any,
          NOT: {
            paymentMethod: {
              in: [...NON_EXPIRABLE_PAYMENT_METHODS],
            },
          },
          // Overlap: start < endRequested && end > startRequested
          startTime: { lt: end },
          endTime: { gt: start },
        },
        select: { id: true },
      });

      if (!candidates.length) {
        return ApiResponse.success({ released: [], count: 0 });
      }

      // Cancelar individualmente para disparar triggers/eventos si existen
      const releasedIds: string[] = [];
      for (const r of candidates) {
        await db.reservation.update({
          where: { id: r.id },
          data: { status: 'CANCELLED' as any, updatedAt: new Date() },
        });
        releasedIds.push(r.id);
      }

      // Registrar un evento de auditoría simple (best-effort)
      try {
        await db.outboxEvent.create({
          data: {
            eventType: 'RESERVATION_RELEASED',
            eventData: { userId: user.id, courtId, startTime: start.toISOString(), endTime: end.toISOString(), releasedIds } as any,
          },
        });
      } catch {}

      return ApiResponse.success({ released: releasedIds, count: releasedIds.length });
    } catch (error) {
      console.error('Error liberando conflictos:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}


