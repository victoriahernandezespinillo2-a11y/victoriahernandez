import { db } from '@repo/db';
import { reservationNotificationService } from './reservation-notification.service';

const ONLINE_PAYMENT_METHODS = ['LINK', 'redsys', 'stripe'];
const REMINDER_EVENT_TYPE = 'PAYMENT_PENDING_REMINDER';

export class ReservationReminderService {
  static resolveDelayMinutes() {
    return Math.max(1, parseInt(process.env.PENDING_PAYMENT_REMINDER_DELAY_MINUTES || '5', 10));
  }

  static async schedulePendingPaymentReminder(reservationId: string, baseDate: Date = new Date()) {
    const delayMinutes = this.resolveDelayMinutes();
    const sendAfter = new Date(baseDate.getTime() + delayMinutes * 60 * 1000);

    await db.outboxEvent.deleteMany({
      where: {
        eventType: REMINDER_EVENT_TYPE,
        eventData: {
          path: ['reservationId'],
          equals: reservationId,
        } as any,
        processed: false,
      },
    });

    await db.outboxEvent.create({
      data: {
        eventType: REMINDER_EVENT_TYPE,
        eventData: {
          reservationId,
          sendAfter: sendAfter.toISOString(),
        } as any,
      },
    });
  }

  static async processPendingPaymentReminders(referenceDate: Date = new Date()) {
    const batchSize = parseInt(process.env.PENDING_PAYMENT_REMINDER_BATCH_SIZE || '20', 10);
    const delayMinutes = this.resolveDelayMinutes();
    const threshold = new Date(referenceDate.getTime() - delayMinutes * 60 * 1000);
    const nowIso = referenceDate.toISOString();

    await this.ensureScheduledReminders(threshold, referenceDate, batchSize, delayMinutes);

    const events = await db.outboxEvent.findMany({
      where: {
        eventType: REMINDER_EVENT_TYPE,
        processed: false,
        eventData: {
          path: ['sendAfter'],
          lte: nowIso,
        } as any,
      },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    let processed = 0;

    for (const event of events) {
      const reservationId = (event.eventData as any)?.reservationId as string | undefined;
      if (!reservationId) {
        await db.outboxEvent.update({
          where: { id: event.id },
          data: { processed: true, processedAt: new Date() },
        });
        continue;
      }

      try {
        const reservation = await db.reservation.findUnique({
          where: { id: reservationId },
        });

        if (!reservation || reservation.status !== 'PENDING' || !reservation.paymentMethod) {
          await db.outboxEvent.update({
            where: { id: event.id },
            data: { processed: true, processedAt: new Date() },
          });
          continue;
        }

        if (!ONLINE_PAYMENT_METHODS.includes(reservation.paymentMethod as any)) {
          await db.outboxEvent.update({
            where: { id: event.id },
            data: { processed: true, processedAt: new Date() },
          });
          continue;
        }

        const result = await reservationNotificationService.sendPendingPaymentReminder(reservationId, {
          expiresAt: reservation.expiresAt ?? undefined,
          ctaLabel: 'Completar pago',
        });

        await db.outboxEvent.update({
          where: { id: event.id },
          data: {
            processed: true,
            processedAt: new Date(),
            eventData: {
              ...toObject(event.eventData),
              sentAt: result?.success ? new Date().toISOString() : undefined,
            } as any,
          },
        });

        if (result?.success) {
          processed += 1;
        }
      } catch (error) {
        console.error('[ReservationReminderService] Error procesando recordatorio de pago pendiente:', error);
        await db.outboxEvent.update({
          where: { id: event.id },
          data: {
            processed: true,
            processedAt: new Date(),
            eventData: {
              ...toObject(event.eventData),
              error: error instanceof Error ? error.message : 'unknown-error',
            } as any,
          },
        });
      }
    }

    return { processed };
  }

  private static async ensureScheduledReminders(
    threshold: Date,
    referenceDate: Date,
    batchSize: number,
    delayMinutes: number,
  ) {
    const reservations = await db.reservation.findMany({
      where: {
        status: 'PENDING',
        paymentMethod: { in: ONLINE_PAYMENT_METHODS },
        createdAt: { lt: threshold },
        expiresAt: { gt: referenceDate },
      },
      select: {
        id: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    for (const reservation of reservations) {
      const existing = await db.outboxEvent.findFirst({
        where: {
          eventType: REMINDER_EVENT_TYPE,
          processed: false,
          eventData: {
            path: ['reservationId'],
            equals: reservation.id,
          } as any,
        },
      });

      if (existing) continue;

      const sendAfter = new Date(
        Math.max(
          reservation.createdAt.getTime() + delayMinutes * 60 * 1000,
          referenceDate.getTime(),
        ),
      );

      await db.outboxEvent.create({
        data: {
          eventType: REMINDER_EVENT_TYPE,
          eventData: {
            reservationId: reservation.id,
            sendAfter: sendAfter.toISOString(),
          } as any,
        },
      });
    }
  }
}

function toObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
