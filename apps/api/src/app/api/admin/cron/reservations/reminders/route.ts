import { NextRequest } from 'next/server';
import { ApiResponse, withAdminMiddleware } from '@/lib/middleware';
import { db } from '@repo/db';
import { notificationService, NotificationUtils } from '@repo/notifications';

function windowRange(targetMinutesAhead: number, windowMinutes = 10) {
  const now = new Date();
  const start = new Date(now.getTime() + targetMinutesAhead * 60000);
  const end = new Date(start.getTime() + windowMinutes * 60000);
  return { start, end };
}

export async function GET(request: NextRequest) {
  // Protección simple por secreto opcional (útil para Vercel cron externamente)
  const secret = request.nextUrl.searchParams.get('secret');
  if ((process.env.CRON_SECRET || '') && secret !== process.env.CRON_SECRET) {
    return ApiResponse.unauthorized('No autorizado');
  }

  // Permitir invocación sin sesión usando secreto, o autenticado admin vía withAdminMiddleware
  return await withAdminMiddleware(async () => {
    try {
      const tasks: Array<{ label: '24h' | '2h'; start: Date; end: Date }> = [
        (() => { const { start, end } = windowRange(24 * 60, 15); return { label: '24h' as const, start, end }; })(),
        (() => { const { start, end } = windowRange(2 * 60, 15); return { label: '2h' as const, start, end }; })(),
      ];

      let sent = 0;

      for (const task of tasks) {
        const reservations = await db.reservation.findMany({
          where: {
            startTime: { gte: task.start, lte: task.end },
            status: { notIn: ['CANCELLED', 'NO_SHOW'] as any },
          },
          include: { user: true, court: { select: { name: true } } },
        });

        for (const r of reservations) {
          if (!r.user?.email && !r.user?.phone) continue;
          // Evitar duplicados: filtrar por JSON path (reservationId y type)
          const already = await db.outboxEvent.findFirst({
            where: {
              eventType: 'RESERVATION_REMINDER_SENT',
              AND: [
                { eventData: { path: ['reservationId'], equals: r.id } as any },
                { eventData: { path: ['type'], equals: task.label } as any },
              ] as any,
            },
          });
          if (already) continue;

          const variables = NotificationUtils.formatTemplateVariables({
            userName: r.user?.name || 'Usuario',
            courtName: r.court?.name || '',
            date: r.startTime,
            startTime: r.startTime,
            endTime: r.endTime,
            reservationCode: r.id.slice(0, 8).toUpperCase(),
          });

          await notificationService.sendMultiChannelNotification({
            email: r.user?.email || undefined,
            sms: r.user?.phone || undefined,
            emailTemplate: 'reservationReminder',
            smsTemplate: undefined,
            variables,
          });

          await db.outboxEvent.create({
            data: { eventType: 'RESERVATION_REMINDER_SENT', eventData: { reservationId: r.id, type: task.label, at: new Date().toISOString() } as any },
          });
          sent++;
        }
      }

      return ApiResponse.success({ sent });
    } catch (e) {
      console.error('Cron reminders error:', e);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request, {} as any);
}




