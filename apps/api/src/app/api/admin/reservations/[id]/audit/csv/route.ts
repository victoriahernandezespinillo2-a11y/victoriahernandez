import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    const segments = req.nextUrl.pathname.split('/');
    const ridx = segments.findIndex((s) => s === 'reservations');
    const id = ridx !== -1 && segments[ridx + 1] ? segments[ridx + 1] : '';
    if (!id) return ApiResponse.badRequest('ID de reserva requerido');

    const reservation = await db.reservation.findUnique({
      where: { id },
      include: { user: true, court: { include: { center: true } } },
    });
    if (!reservation) return ApiResponse.notFound('Reserva no encontrada');

    const events = await db.outboxEvent.findMany({
      where: { eventData: { path: ['reservationId'], equals: id } as any },
      orderBy: { createdAt: 'desc' },
      select: { eventType: true, eventData: true, createdAt: true, id: true },
    } as any);

    const rows: string[] = [];
    const header = ['createdAt', 'type', 'summary'];
    rows.push(header.join(','));
    for (const ev of (events as any[])) {
      const summary = summarize(ev.eventType, ev.eventData);
      const created = new Date(ev.createdAt).toISOString();
      rows.push([created, ev.eventType, escapeCsv(summary)].join(','));
    }

    const filename = `audit-${reservation.id}.csv`;
    const res = ApiResponse.success(rows.join('\n'));
    res.headers.set('Content-Type', 'text/csv; charset=utf-8');
    res.headers.set('Content-Disposition', `attachment; filename=${filename}`);
    return res;
  })(request, {} as any);
}

function summarize(type: string, data: any): string {
  try {
    switch (type) {
      case 'PRICE_OVERRIDE':
        return `Ajuste de precio €${Number(data?.delta || 0).toFixed(2)} – ${data?.reason || 'Sin motivo'}`;
      case 'PAYMENT_RECORDED':
        return `Pago ${data?.method || ''} – €${Number(data?.amount || 0).toFixed(2)}`;
      case 'PAYMENT_LINK_CREATED':
        return 'Enlace de pago generado';
      case 'RESERVATION_PAID':
        return `Pago conciliado (${data?.paymentIntentId || 'PI'})`;
      case 'RESERVATION_REFUNDED':
        return `Reembolso €${Number(data?.amount || 0).toFixed(2)}`;
      case 'RESERVATION_CHECKED_IN':
        return 'Check-in';
      case 'RESERVATION_CHECKED_OUT':
        return 'Check-out';
      case 'RESERVATION_CONFIRMATION_REQUESTED':
        return `Confirmación solicitada (${data?.channel || 'EMAIL'})`;
      default:
        return type;
    }
  } catch { return type; }
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}


