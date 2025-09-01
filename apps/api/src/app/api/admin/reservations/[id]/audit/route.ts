import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const segments = req.nextUrl.pathname.split('/');
      const ridx = segments.findIndex((s) => s === 'reservations');
      const id = ridx !== -1 && segments[ridx + 1] ? segments[ridx + 1] : '';
      if (!id) return ApiResponse.badRequest('ID de reserva requerido');

      const reservation = await db.reservation.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          court: { select: { id: true, name: true, center: { select: { id: true, name: true } } } },
        },
      });
      if (!reservation) return ApiResponse.notFound('Reserva no encontrada');

      const events = await db.outboxEvent.findMany({
        where: { eventData: { path: ['reservationId'], equals: id } as any },
        orderBy: { createdAt: 'desc' },
        select: { id: true, eventType: true, eventData: true, createdAt: true },
      } as any);

      const mappedEvents = (events as any[]).map((e) => ({
        id: e.id,
        type: e.eventType,
        createdAt: e.createdAt,
        data: e.eventData,
        summary: summarizeEvent(e.eventType as string, e.eventData),
      }));

      return ApiResponse.success({ reservation, events: mappedEvents });
    } catch (error) {
      console.error('Admin audit error:', error);
      return ApiResponse.internalError('Error obteniendo auditoría');
    }
  })(request);
}

function summarizeEvent(type: string, data: any): string {
  try {
    switch (type) {
      case 'PRICE_OVERRIDE':
        return `Ajuste de precio €${Number(data?.delta || 0).toFixed(2)} – ${data?.reason || 'Sin motivo'}`;
      case 'PAYMENT_RECORDED':
        return `Pago registrado ${data?.method || ''} – €${Number(data?.amount || 0).toFixed(2)}`;
      case 'PAYMENT_LINK_CREATED':
        return 'Enlace de pago generado';
      case 'RESERVATION_PAID':
        return `Pago conciliado (${data?.paymentIntentId || 'PI'})`;
      case 'RESERVATION_REFUNDED':
        return `Reembolso procesado €${Number(data?.amount || 0).toFixed(2)}`;
      case 'RESERVATION_CHECKED_IN':
        return 'Check-in realizado';
      case 'RESERVATION_CHECKED_OUT':
        return 'Check-out realizado';
      case 'RESERVATION_CONFIRMATION_REQUESTED':
        return `Confirmación solicitada (${data?.channel || 'EMAIL'})`;
      default:
        return type;
    }
  } catch {
    return type;
  }
}


