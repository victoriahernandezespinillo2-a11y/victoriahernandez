import { db, type WaitingList, type Reservation, type User, type Court } from '@repo/db';
import { z } from 'zod';
import { NotificationService, NotificationUtils } from '@repo/notifications';
import { ReservationService } from './reservation.service';

// Esquemas de validación
export const AddToWaitingListSchema = z.object({
  courtId: z.string().cuid(),
  userId: z.string().cuid(),
  requestedTime: z.string().datetime(),
  maxWaitMinutes: z.number().min(15).max(1440).default(60), // 15 minutos a 24 horas
  duration: z.number().min(30).max(480).default(60), // 30 minutos a 8 horas
});

export const UpdateWaitingListSchema = z.object({
  maxWaitMinutes: z.number().min(15).max(1440).optional(),
  priority: z.number().min(0).max(100).optional(),
  status: z.enum(['waiting', 'notified', 'expired', 'converted']).optional(),
});

export type AddToWaitingListInput = z.infer<typeof AddToWaitingListSchema>;
export type UpdateWaitingListInput = z.infer<typeof UpdateWaitingListSchema>;

export class WaitingListService {
  private notificationService: NotificationService;
  private reservationService: ReservationService;

  constructor() {
    this.notificationService = new NotificationService();
    this.reservationService = new ReservationService();
  }

  /**
   * Agregar usuario a lista de espera
   */
  async addToWaitingList(input: AddToWaitingListInput): Promise<WaitingList> {
    const validatedInput = AddToWaitingListSchema.parse(input);
    
    // Verificar que el usuario no esté ya en la lista de espera para este horario
    const existingEntry = await db.waitingList.findFirst({
      where: {
        courtId: validatedInput.courtId,
        userId: validatedInput.userId,
        requestedTime: new Date(validatedInput.requestedTime),
        status: 'waiting',
      },
    });
    
    if (existingEntry) {
      throw new Error('Ya estás en la lista de espera para este horario');
    }
    
    // Calcular prioridad basada en membresía y historial
    const priority = await this.calculatePriority(validatedInput.userId);
    
    // Calcular tiempo de expiración
    const expiresAt = new Date(
      Date.now() + validatedInput.maxWaitMinutes * 60 * 1000
    );
    
    const waitingListEntry = await db.waitingList.create({
      data: {
        courtId: validatedInput.courtId,
        userId: validatedInput.userId,
        requestedTime: new Date(validatedInput.requestedTime),
        maxWaitMinutes: validatedInput.maxWaitMinutes,
        priority,
        expiresAt,
        status: 'waiting',
      },
    });
    
    // Crear evento para procesamiento asíncrono
    await db.outboxEvent.create({
      data: {
        eventType: 'WAITING_LIST_ADDED',
        eventData: {
          waitingListId: waitingListEntry.id,
          userId: validatedInput.userId,
          courtId: validatedInput.courtId,
          requestedTime: validatedInput.requestedTime,
        },
      },
    });
    
    return waitingListEntry;
  }

  /**
   * Calcular prioridad basada en membresía y historial del usuario
   */
  private async calculatePriority(userId: string): Promise<number> {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: {
            status: 'active',
            validFrom: { lte: new Date() },
            validUntil: { gte: new Date() },
          },
        },
        reservations: {
          where: {
            status: { in: ['confirmed', 'completed'] },
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Últimos 30 días
            },
          },
        },
      },
    });
    
    if (!user) {
      return 0;
    }
    
    let priority = 0;
    
    // Prioridad por membresía
    if (user.memberships.length > 0) {
      const membership = user.memberships[0];
      switch (membership.type) {
        case 'annual':
          priority += 50;
          break;
        case 'quarterly':
          priority += 30;
          break;
        case 'monthly':
          priority += 20;
          break;
        case 'punch_card':
          priority += 10;
          break;
      }
    }
    
    // Prioridad por frecuencia de uso (últimos 30 días)
    const reservationCount = user.reservations.length;
    if (reservationCount >= 10) {
      priority += 20;
    } else if (reservationCount >= 5) {
      priority += 10;
    } else if (reservationCount >= 1) {
      priority += 5;
    }
    
    // Prioridad por antigüedad del usuario
    const accountAge = Date.now() - user.createdAt.getTime();
    const daysOld = accountAge / (24 * 60 * 60 * 1000);
    
    if (daysOld >= 365) {
      priority += 15;
    } else if (daysOld >= 180) {
      priority += 10;
    } else if (daysOld >= 30) {
      priority += 5;
    }
    
    return Math.min(priority, 100); // Máximo 100 puntos de prioridad
  }

  /**
   * Procesar cancelación de reserva y notificar lista de espera
   */
  async processReservationCancellation(reservationId: string): Promise<void> {
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: {
        court: true,
      },
    });
    
    if (!reservation) {
      return;
    }
    
    // Buscar usuarios en lista de espera para este horario
    const waitingUsers = await db.waitingList.findMany({
      where: {
        courtId: reservation.courtId,
        status: 'waiting',
        expiresAt: { gt: new Date() },
        requestedTime: {
          gte: new Date(reservation.startTime.getTime() - 30 * 60 * 1000), // 30 min antes
          lte: new Date(reservation.endTime.getTime() + 30 * 60 * 1000), // 30 min después
        },
      },
      include: {
        user: true,
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });
    
    // Notificar a usuarios en orden de prioridad
    for (const waitingEntry of waitingUsers) {
      try {
        await this.notifyWaitingUser(waitingEntry, reservation);
        
        // Actualizar estado a notificado
        await db.waitingList.update({
          where: { id: waitingEntry.id },
          data: {
            status: 'notified',
            notifiedAt: new Date(),
          },
        });
        
        // Solo notificar al primer usuario de mayor prioridad
        break;
      } catch (error) {
        console.error(`Error notificando usuario en lista de espera ${waitingEntry.id}:`, error);
      }
    }
  }

  /**
   * Notificar a usuario en lista de espera
   */
  private async notifyWaitingUser(
    waitingEntry: WaitingList & { user: User },
    availableReservation: Reservation & { court: Court }
  ): Promise<void> {
    const { user, court } = { user: waitingEntry.user, court: availableReservation.court };
    
    // Calcular tiempo límite para responder (15 minutos)
    const responseDeadline = new Date(Date.now() + 15 * 60 * 1000);
    
    // Preparar variables para las plantillas
    const templateVariables = NotificationUtils.formatTemplateVariables({
      userName: user.name || 'Usuario',
      courtName: court.name,
      startTime: availableReservation.startTime,
      endTime: availableReservation.endTime,
      responseDeadline: responseDeadline,
      reservationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reservations/claim/${waitingEntry.id}`,
    });

    // Enviar notificación multicanal
    await this.notificationService.sendMultiChannelNotification({
      email: user.email || undefined,
      sms: user.phone || undefined,
      emailTemplate: 'WAITING_LIST_SLOT_AVAILABLE',
      smsTemplate: 'WAITING_LIST_SLOT_AVAILABLE_SMS',
      variables: templateVariables,
    });
  }

  /**
   * Reclamar slot disponible desde lista de espera
   */
  async claimSlot(
    waitingListId: string,
    paymentMethod?: 'stripe' | 'redsys' | 'credits'
  ): Promise<{ success: boolean; reservation?: Reservation; error?: string }> {
    // Primero verificar el estado de la entrada de lista de espera
    const waitingEntry = await db.waitingList.findUnique({
      where: { id: waitingListId },
      include: {
        user: true,
        court: true,
      },
    });
    
    if (!waitingEntry) {
      return { success: false, error: 'Entrada de lista de espera no encontrada' };
    }
    
    if (waitingEntry.status !== 'notified') {
      return { success: false, error: 'Esta oportunidad ya no está disponible' };
    }
    
    if (waitingEntry.expiresAt < new Date()) {
      return { success: false, error: 'Esta oportunidad ha expirado' };
    }
    
    // Verificar que el slot sigue disponible
    const conflictingReservations = await db.reservation.findMany({
      where: {
        courtId: waitingEntry.courtId,
        status: { in: ['pending', 'confirmed'] },
        OR: [
          {
            startTime: { lt: waitingEntry.requestedTime },
            endTime: { gt: waitingEntry.requestedTime },
          },
        ],
      },
    });
    
    if (conflictingReservations.length > 0) {
      return { success: false, error: 'El horario ya no está disponible' };
    }
    
    try {
      // Crear reserva (maneja su propia transacción)
      const reservation = await this.reservationService.createReservation({
        courtId: waitingEntry.courtId,
        userId: waitingEntry.userId,
        startTime: waitingEntry.requestedTime.toISOString(),
        duration: 60, // Duración por defecto
        isRecurring: false,
        paymentMethod,
      });
      
      // Actualizar estado de lista de espera después de crear la reserva exitosamente
      await db.waitingList.update({
        where: { id: waitingListId },
        data: {
          status: 'converted',
        },
      });
      
      return { success: true, reservation };
    } catch (error) {
      return { success: false, error: `Error creando reserva: ${error}` };
    }
  }

  /**
   * Obtener lista de espera por usuario
   */
  async getWaitingListByUser(userId: string): Promise<WaitingList[]> {
    return await db.waitingList.findMany({
      where: {
        userId,
        status: { in: ['waiting', 'notified'] },
        expiresAt: { gt: new Date() },
      },
      include: {
        court: {
          include: {
            center: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Obtener lista de espera por cancha
   */
  async getWaitingListByCourt(
    courtId: string,
    { startDate, endDate }: { startDate?: Date; endDate?: Date } = {}
  ): Promise<WaitingList[]> {
    return await db.waitingList.findMany({
      where: {
        courtId,
        status: { in: ['waiting', 'notified'] },
        expiresAt: { gt: new Date() },
        ...(startDate && endDate && {
          requestedTime: {
            gte: startDate,
            lte: endDate,
          },
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            membershipType: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * Cancelar entrada de lista de espera
   */
  async cancelWaitingListEntry(id: string, userId: string): Promise<void> {
    const waitingEntry = await db.waitingList.findUnique({
      where: { id },
    });
    
    if (!waitingEntry) {
      throw new Error('Entrada de lista de espera no encontrada');
    }
    
    if (waitingEntry.userId !== userId) {
      throw new Error('No tienes permisos para cancelar esta entrada');
    }
    
    await db.waitingList.update({
      where: { id },
      data: {
        status: 'expired',
      },
    });
  }

  /**
   * Limpiar entradas expiradas de lista de espera
   */
  async cleanupExpiredEntries(): Promise<number> {
    const result = await db.waitingList.updateMany({
      where: {
        status: { in: ['waiting', 'notified'] },
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'expired',
      },
    });
    
    return result.count;
  }

  /**
   * Obtener estadísticas de lista de espera
   */
  async getWaitingListStats(courtId?: string): Promise<{
    totalWaiting: number;
    totalNotified: number;
    totalConverted: number;
    totalExpired: number;
    averageWaitTime: number;
    conversionRate: number;
  }> {
    const where = courtId ? { courtId } : {};
    
    const [waiting, notified, converted, expired] = await Promise.all([
      db.waitingList.count({ where: { ...where, status: 'waiting' } }),
      db.waitingList.count({ where: { ...where, status: 'notified' } }),
      db.waitingList.count({ where: { ...where, status: 'converted' } }),
      db.waitingList.count({ where: { ...where, status: 'expired' } }),
    ]);
    
    // Calcular tiempo promedio de espera para entradas convertidas
    const convertedEntries = await db.waitingList.findMany({
      where: {
        ...where,
        status: 'converted',
        notifiedAt: { not: null },
      },
      select: {
        createdAt: true,
        notifiedAt: true,
      },
    });
    
    const averageWaitTime = convertedEntries.length > 0
      ? convertedEntries.reduce((sum, entry) => {
          const waitTime = entry.notifiedAt!.getTime() - entry.createdAt.getTime();
          return sum + waitTime;
        }, 0) / convertedEntries.length / (60 * 1000) // Convertir a minutos
      : 0;
    
    const totalProcessed = converted + expired;
    const conversionRate = totalProcessed > 0 ? (converted / totalProcessed) * 100 : 0;
    
    return {
      totalWaiting: waiting,
      totalNotified: notified,
      totalConverted: converted,
      totalExpired: expired,
      averageWaitTime,
      conversionRate,
    };
  }
}

export const waitingListService = new WaitingListService();