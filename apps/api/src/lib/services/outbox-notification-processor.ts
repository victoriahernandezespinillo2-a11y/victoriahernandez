import { db } from '@repo/db';

type ProcessOptions = {
  max?: number;
  sinceHours?: number;
};

// Mapea tipos de evento a categoría, título y plantilla de mensaje
function mapEventToNotification(eventType: string, eventData: any): {
  category: string;
  title: string;
  message: string;
} | null {
  switch (eventType) {
    case 'RESERVATION_CREATED':
      return {
        category: 'RESERVATION',
        title: 'Reserva creada',
        message: `Se ha creado la reserva ${eventData?.reservationId || ''}.`,
      };
    case 'RESERVATION_CONFIRMATION_REQUESTED':
      return {
        category: 'RESERVATION',
        title: 'Confirmación enviada',
        message: `Se ha enviado confirmación para la reserva ${eventData?.reservationId || ''}.`,
      };
    case 'RESERVATION_PAID':
    case 'PAYMENT_RECORDED':
      return {
        category: 'PAYMENT',
        title: 'Pago registrado',
        message: `Pago registrado para la reserva ${eventData?.reservationId || ''}.`,
      };
    case 'RESERVATION_CHECKED_IN':
      return {
        category: 'RESERVATION',
        title: 'Check-in realizado',
        message: `Check-in realizado para la reserva ${eventData?.reservationId || ''}.`,
      };
    case 'RESERVATION_CHECKED_OUT':
      return {
        category: 'RESERVATION',
        title: 'Check-out realizado',
        message: `Check-out realizado para la reserva ${eventData?.reservationId || ''}.`,
      };
    case 'RESERVATION_CANCELLED':
      return {
        category: 'RESERVATION',
        title: 'Reserva cancelada',
        message: `Se canceló la reserva ${eventData?.reservationId || ''}.`,
      };
    case 'RESERVATION_NO_SHOW':
      return {
        category: 'RESERVATION',
        title: 'No se presentó',
        message: `Reserva ${eventData?.reservationId || ''} marcada como NO_SHOW.`,
      };
    case 'PRICE_OVERRIDE':
      return {
        category: 'PAYMENT',
        title: 'Ajuste de precio',
        message: `Se aplicó un ajuste de precio a la reserva ${eventData?.reservationId || ''}.`,
      };
    default:
      return null;
  }
}

export async function processOutboxNotifications(options: ProcessOptions = {}): Promise<{ processed: number }>{
  const max = Math.max(1, Math.min(200, options.max ?? 50));
  const sinceHours = Math.max(1, Math.min(24 * 30, options.sinceHours ?? 24 * 7));
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

  // Lista de eventos a materializar como notificaciones
  const eventTypes = [
    'RESERVATION_CREATED',
    'RESERVATION_CONFIRMATION_REQUESTED',
    'RESERVATION_PAID',
    'PAYMENT_RECORDED',
    'RESERVATION_CHECKED_IN',
    'RESERVATION_CHECKED_OUT',
    'RESERVATION_CANCELLED',
    'RESERVATION_NO_SHOW',
    'PRICE_OVERRIDE',
  ];

  // Buscar eventos recientes aún no materializados (idempotencia por externalId)
  const outbox = await db.outboxEvent.findMany({
    where: {
      eventType: { in: eventTypes },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    take: max,
  });

  let processed = 0;
  for (const ev of outbox) {
    try {
      const exists = await (db as any).notification.findFirst({ where: { externalId: ev.id } });
      if (exists) continue; // idempotente

      const payload = mapEventToNotification(ev.eventType, ev.eventData as any);
      if (!payload) continue;

      // Resolver userId; preferir eventData.userId, si no deriva desde la reserva
      let userId: string | null = (ev as any).eventData?.userId || null;
      if (!userId && (ev as any).eventData?.reservationId) {
        const r = await db.reservation.findUnique({ where: { id: (ev as any).eventData.reservationId }, select: { userId: true } });
        userId = r?.userId || null;
      }
      if (!userId) continue;

      await (db as any).notification.create({
        data: {
          userId,
          type: 'IN_APP',
          category: payload.category,
          title: payload.title,
          message: payload.message,
          priority: 'MEDIUM',
          status: 'SENT',
          data: (ev as any).eventData || {},
          actionUrl: undefined,
          externalId: ev.id,
          sentAt: new Date(),
        },
      });
      processed += 1;
    } catch {
      // No romper por errores puntuales; continuará en próxima pasada
    }
  }

  return { processed };
}


