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
      // Eventos de creación y estado inicial
      case 'RESERVATION_PENDING':
        return `Reserva creada - Pendiente de pago (€${Number(data?.totalPrice || 0).toFixed(2)})`;
      
      // Eventos de pago
      case 'PAYMENT_RECORDED':
        return `Pago registrado ${data?.method || ''} – €${Number(data?.amount || 0).toFixed(2)}`;
      case 'PAYMENT_LINK_CREATED':
        return 'Enlace de pago generado';
      case 'RESERVATION_PAID':
        const paymentMethod = data?.paymentMethod || data?.method || '';
        if (paymentMethod === 'CREDITS') {
          const creditsUsed = data?.creditsUsed || data?.credits || 0;
          const amount = data?.amount || 0;
          return `Pago completado con créditos - ${Number(creditsUsed).toFixed(2)} créditos (€${Number(amount).toFixed(2)})`;
        }
        return `Pago completado ${paymentMethod ? `(${paymentMethod})` : ''} - €${Number(data?.amount || 0).toFixed(2)}`;
      
      // Eventos de créditos
      case 'CREDITS_DEBITED':
        const debitedCredits = data?.credits || 0;
        const debitedAmount = data?.amountEuro || 0;
        const euroPerCredit = data?.euroPerCredit || 1;
        return `Créditos debitados - ${Number(debitedCredits).toFixed(2)} créditos (€${Number(debitedAmount).toFixed(2)} @ €${Number(euroPerCredit).toFixed(2)}/crédito)`;
      case 'CREDITS_REFUNDED':
        const refundedCredits = data?.creditsRefunded || data?.credits || 0;
        const refundedAmount = data?.amount || data?.amountEuro || 0;
        return `Créditos reintegrados - ${Number(refundedCredits).toFixed(2)} créditos (€${Number(refundedAmount).toFixed(2)})`;
      
      // Eventos de cancelación
      case 'RESERVATION_CANCELLED':
        return `Reserva cancelada${data?.reason ? ` - ${data.reason}` : ''}`;
      case 'RESERVATION_AUTO_CANCELLED':
        return `Reserva cancelada automáticamente${data?.reason ? ` - ${data.reason}` : ''}`;
      case 'RESERVATION_EXPIRED':
        return 'Reserva expirada (timeout de pago)';
      case 'RESERVATION_RELEASED':
        return 'Reserva liberada (conflicto resuelto)';
      
      // Eventos de reembolso
      case 'RESERVATION_REFUNDED':
        const refundAmount = data?.amount || 0;
        const refundCredits = data?.creditsRefunded || 0;
        const refundReason = data?.reason || '';
        if (refundCredits > 0) {
          return `Reembolso en créditos - ${Number(refundCredits).toFixed(2)} créditos (€${Number(refundAmount).toFixed(2)})${refundReason ? ` - ${refundReason}` : ''}`;
        }
        return `Reembolso procesado - €${Number(refundAmount).toFixed(2)}${refundReason ? ` - ${refundReason}` : ''}`;
      
      // Eventos de check-in/out
      case 'RESERVATION_CHECKED_IN':
        return `Check-in realizado${data?.at ? ` a las ${new Date(data.at).toLocaleString('es-ES')}` : ''}`;
      case 'RESERVATION_CHECKED_OUT':
        return `Check-out realizado${data?.at ? ` a las ${new Date(data.at).toLocaleString('es-ES')}` : ''}`;
      
      // Eventos de notificaciones
      case 'RESERVATION_CONFIRMATION_REQUESTED':
        return `Confirmación solicitada (${data?.channel || 'EMAIL'})`;
      
      // Eventos de ajustes
      case 'PRICE_OVERRIDE':
        return `Ajuste de precio €${Number(data?.delta || 0).toFixed(2)} – ${data?.reason || 'Sin motivo'}`;
      case 'COURTESY_GRANTED':
        return `Cortesía otorgada${data?.reason ? ` - ${data.reason}` : ''}`;
      
      // Eventos legacy (compatibilidad)
      case 'reservation_paid':
        // Manejar formato antiguo con 'type' y 'payload'
        const payload = data?.payload || data;
        if (payload?.paymentMethod === 'CREDITS' || payload?.creditsUsed) {
          return `Pago completado con créditos - ${Number(payload?.creditsUsed || 0).toFixed(2)} créditos (€${Number(payload?.amount || 0).toFixed(2)})`;
        }
        return `Pago completado - €${Number(payload?.amount || 0).toFixed(2)}`;
      
      default:
        // Intentar extraer información útil del data si existe
        if (data) {
          if (data.amount || data.amountEuro) {
            return `${type} - €${Number(data.amount || data.amountEuro || 0).toFixed(2)}`;
          }
          if (data.credits || data.creditsUsed || data.creditsRefunded) {
            return `${type} - ${Number(data.credits || data.creditsUsed || data.creditsRefunded || 0).toFixed(2)} créditos`;
          }
        }
        return type;
    }
  } catch (error) {
    console.error('Error summarizing event:', error, { type, data });
    return type;
  }
}


