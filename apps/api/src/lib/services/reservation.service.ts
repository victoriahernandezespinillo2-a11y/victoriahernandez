import { db, type Reservation, type Court, type User } from '@repo/db';
import { z } from 'zod';
import { PricingService } from './pricing.service';
import { NotificationService } from '@repo/notifications';
import { PaymentService } from '@repo/payments';

// Esquemas de validación
export const CreateReservationSchema = z.object({
  courtId: z.string().cuid(),
  userId: z.string().cuid(),
  startTime: z.string().datetime(),
  duration: z.number().min(30).max(480), // 30 minutos a 8 horas
  isRecurring: z.boolean().optional().default(false),
  recurringPattern: z.object({
    frequency: z.enum(['weekly', 'biweekly', 'monthly']),
    daysOfWeek: z.array(z.number().min(1).max(7)),
    endDate: z.string().datetime(),
    exceptions: z.array(z.string().datetime()).optional(),
  }).optional(),
  paymentMethod: z.enum(['stripe', 'redsys', 'credits']).optional(),
  notes: z.string().optional(),
});

export const UpdateReservationSchema = z.object({
  startTime: z.string().datetime().optional(),
  duration: z.number().min(30).max(480).optional(),
  status: z.enum(['PENDING', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  notes: z.string().optional(),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
export type UpdateReservationInput = z.infer<typeof UpdateReservationSchema>;

export class ReservationService {
  private pricingService: PricingService;
  private notificationService: NotificationService;
  private paymentService: PaymentService;

  constructor() {
    this.pricingService = new PricingService();
    this.notificationService = new NotificationService();
    this.paymentService = new PaymentService();
  }

  /**
   * Crear una nueva reserva
   */
  async createReservation(input: CreateReservationInput): Promise<Reservation> {
    const validatedInput = CreateReservationSchema.parse(input);

    // Calcular precio fuera de la transacción (solo lecturas)
    const computedPrice = await this.pricingService.calculatePrice({
      courtId: validatedInput.courtId,
      startTime: new Date(validatedInput.startTime),
      duration: validatedInput.duration,
      userId: validatedInput.userId,
    });

    // Operaciones críticas dentro de transacción con mayor timeout
    const reservation = await (db as any).$transaction(async (tx: any) => {
      // 1) Verificar disponibilidad al momento de crear
      await this.checkAvailability(tx, {
        courtId: validatedInput.courtId,
        startTime: new Date(validatedInput.startTime),
        endTime: new Date(new Date(validatedInput.startTime).getTime() + validatedInput.duration * 60000),
      });

      // 2) Crear reserva principal
      const created = await tx.reservation.create({
        data: {
          courtId: validatedInput.courtId,
          userId: validatedInput.userId,
          startTime: new Date(validatedInput.startTime),
          endTime: new Date(new Date(validatedInput.startTime).getTime() + validatedInput.duration * 60000),
          totalPrice: computedPrice.total,
          status: 'PENDING',
          isRecurring: validatedInput.isRecurring,
          paymentMethod: validatedInput.paymentMethod,
          notes: validatedInput.notes,
        },
      });

      // 3) Crear reservas recurrentes si es necesario (sigue dentro de la transacción)
      if (validatedInput.isRecurring && validatedInput.recurringPattern) {
        await this.createRecurringReservations(tx, created, validatedInput.recurringPattern);
      }

      return created;
    }, { timeout: 15000 });

    // 4) Registrar evento asíncrono fuera de la transacción para no prolongarla
    try {
      await db.outboxEvent.create({
        data: {
          eventType: 'RESERVATION_CREATED',
          eventData: {
            reservationId: reservation.id,
            userId: reservation.userId,
            courtId: reservation.courtId,
            startTime: reservation.startTime,
            totalPrice: reservation.totalPrice,
          },
        },
      });
    } catch (e) {
      // Log y continuar; no bloquear la creación por el outbox
      // eslint-disable-next-line no-console
      console.warn('No se pudo registrar outbox RESERVATION_CREATED:', e);
    }

    return reservation;
  }

  /**
   * Verificar disponibilidad de una cancha
   */
  private async checkAvailability(
    tx: any,
    { courtId, startTime, endTime }: { courtId: string; startTime: Date; endTime: Date }
  ): Promise<void> {
    // Verificar que la cancha existe y está activa
    const court = await tx.court.findUnique({
      where: { id: courtId },
    });
    
    if (!court || !court.isActive) {
      throw new Error('Cancha no disponible');
    }
    
    // Verificar que no hay conflictos con otras reservas
    const conflictingReservations = await tx.reservation.findMany({
      where: {
        courtId,
        status: { in: ['PENDING', 'PAID', 'IN_PROGRESS'] },
        OR: [
          {
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        ],
      },
    });
    
    if (conflictingReservations.length > 0) {
      throw new Error('Horario no disponible');
    }
    
    // Verificar mantenimiento programado
    const maintenanceSchedules = await tx.maintenanceSchedule.findMany({
      where: {
        courtId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        OR: [
          { scheduledAt: { lte: endTime } },
          { completedAt: { gte: startTime } },
        ],
      },
    });
    
    if (maintenanceSchedules.length > 0) {
      throw new Error('Cancha en mantenimiento durante el horario solicitado');
    }
  }

  /**
   * Crear reservas recurrentes
   */
  private async createRecurringReservations(
    tx: any,
    parentReservation: Reservation,
    pattern: NonNullable<CreateReservationInput['recurringPattern']>
  ): Promise<void> {
    const { frequency, daysOfWeek, endDate, exceptions = [] } = pattern;
    const startDate = new Date(parentReservation.startTime);
    const endDateTime = new Date(endDate);
    const duration = parentReservation.endTime.getTime() - parentReservation.startTime.getTime();
    
    let currentDate = new Date(startDate);
    const recurringReservations = [];
    
    // Calcular incremento según frecuencia
    const increment = frequency === 'weekly' ? 7 : frequency === 'biweekly' ? 14 : 30;
    
    while (currentDate <= endDateTime) {
      // Avanzar a la siguiente fecha según frecuencia
      currentDate.setDate(currentDate.getDate() + increment);
      
      if (currentDate > endDateTime) break;
      
      // Verificar si el día de la semana coincide
      const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay(); // Convertir domingo de 0 a 7
      
      if (daysOfWeek.includes(dayOfWeek)) {
        const reservationStart = new Date(currentDate);
        const reservationEnd = new Date(currentDate.getTime() + duration);
        
        // Verificar si no está en excepciones
        const isException = exceptions.some(exception => 
          new Date(exception).toDateString() === reservationStart.toDateString()
        );
        
        if (!isException) {
          try {
            // Verificar disponibilidad
            await this.checkAvailability(tx, {
              courtId: parentReservation.courtId,
              startTime: reservationStart,
              endTime: reservationEnd,
            });
            
            // Crear reserva recurrente
            const recurringReservation = await tx.reservation.create({
              data: {
                courtId: parentReservation.courtId,
                userId: parentReservation.userId,
                startTime: reservationStart,
                endTime: reservationEnd,
                totalPrice: parentReservation.totalPrice,
                status: 'pending',
                isRecurring: true,
                recurringParentId: parentReservation.id,
                paymentMethod: parentReservation.paymentMethod,
                notes: parentReservation.notes,
              },
            });
            
            recurringReservations.push(recurringReservation);
          } catch (error) {
            // Si hay conflicto, simplemente omitir esta fecha
            console.warn(`No se pudo crear reserva recurrente para ${reservationStart}: ${error}`);
          }
        }
      }
    }
  }

  /**
   * Obtener reservas por usuario
   */
  async getReservationsByUser(
    userId: string,
    { status, startDate, endDate }: { status?: string; startDate?: Date; endDate?: Date } = {}
  ): Promise<Reservation[]> {
    return await db.reservation.findMany({
      where: {
        userId,
        ...(status && { status }),
        ...(startDate && endDate && {
          startTime: {
            gte: startDate,
            lte: endDate,
          },
        }),
      },
      include: {
        court: {
          include: {
            center: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  /**
   * Obtener reservas por cancha
   */
  async getReservationsByCourt(
    courtId: string,
    { startDate, endDate }: { startDate: Date; endDate: Date }
  ): Promise<Reservation[]> {
    return await db.reservation.findMany({
      where: {
        courtId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        status: { in: ['PENDING', 'PAID', 'IN_PROGRESS'] },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  /**
   * Actualizar reserva
   */
  async updateReservation(id: string, input: UpdateReservationInput): Promise<Reservation> {
    const validatedInput = UpdateReservationSchema.parse(input);
    
    return await db.$transaction(async (tx) => {
      const existingReservation = await tx.reservation.findUnique({
        where: { id },
      });
      
      if (!existingReservation) {
        throw new Error('Reserva no encontrada');
      }
      
      // Si se cambia la hora, verificar disponibilidad
      if (validatedInput.startTime || validatedInput.duration) {
        const newStartTime = validatedInput.startTime 
          ? new Date(validatedInput.startTime) 
          : existingReservation.startTime;
        const newDuration = validatedInput.duration || 
          (existingReservation.endTime.getTime() - existingReservation.startTime.getTime()) / 60000;
        const newEndTime = new Date(newStartTime.getTime() + newDuration * 60000);
        
        await this.checkAvailability(tx, {
          courtId: existingReservation.courtId,
          startTime: newStartTime,
          endTime: newEndTime,
        });
      }
      
      const updatedReservation = await tx.reservation.update({
        where: { id },
        data: {
          ...validatedInput,
          ...(validatedInput.startTime && { startTime: new Date(validatedInput.startTime) }),
          ...(validatedInput.duration && {
            endTime: new Date(
              (validatedInput.startTime ? new Date(validatedInput.startTime) : existingReservation.startTime).getTime() + 
              validatedInput.duration * 60000
            ),
          }),
        },
      });
      
      // Crear evento para procesamiento asíncrono
      await tx.outboxEvent.create({
        data: {
          eventType: 'RESERVATION_UPDATED',
          eventData: {
            reservationId: updatedReservation.id,
            changes: validatedInput,
          },
        },
      });
      
      return updatedReservation;
    });
  }

  /**
   * Cancelar reserva
   */
  async cancelReservation(id: string, reason?: string): Promise<Reservation> {
    return await db.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id },
        include: {
          user: true,
          court: true,
        },
      });
      
      if (!reservation) {
        throw new Error('Reserva no encontrada');
      }
      
      if (reservation.status === 'cancelled') {
        throw new Error('La reserva ya está cancelada');
      }
      
      const updatedReservation = await tx.reservation.update({
        where: { id },
        data: {
          status: 'cancelled',
          notes: reason ? `${reservation.notes || ''} - Cancelada: ${reason}` : reservation.notes,
        },
      });
      
      // Crear evento para procesamiento asíncrono (reembolsos, notificaciones, lista de espera)
      await tx.outboxEvent.create({
        data: {
          eventType: 'RESERVATION_CANCELLED',
          eventData: {
            reservationId: updatedReservation.id,
            userId: reservation.userId,
            courtId: reservation.courtId,
            startTime: reservation.startTime,
            endTime: reservation.endTime,
            reason,
          },
        },
      });
      
      return updatedReservation;
    });
  }

  /**
   * Confirmar reserva (check-in)
   */
  async checkInReservation(id: string): Promise<Reservation> {
    return await db.reservation.update({
      where: { id },
      data: {
        status: 'confirmed',
        checkInTime: new Date(),
      },
    });
  }

  /**
   * Completar reserva (check-out)
   */
  async checkOutReservation(id: string): Promise<Reservation> {
    return await db.reservation.update({
      where: { id },
      data: {
        status: 'completed',
        checkOutTime: new Date(),
      },
    });
  }

  /**
   * Obtener disponibilidad de canchas
   */
  async getCourtAvailability(
    courtId: string,
    date: Date
  ): Promise<{ available: boolean; slots: Array<{ start: Date; end: Date; available: boolean }> }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Obtener reservas del día
    const reservations = await this.getReservationsByCourt(courtId, {
      startDate: startOfDay,
      endDate: endOfDay,
    });
    
    // Obtener mantenimientos relevantes del día (adaptado al esquema actual)
    const maintenanceSchedules = await db.maintenanceSchedule.findMany({
      where: {
        courtId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        OR: [
          { scheduledAt: { gte: startOfDay, lte: endOfDay } },
          { startedAt: { gte: startOfDay, lte: endOfDay } },
          { completedAt: { gte: startOfDay, lte: endOfDay } },
        ],
      },
      select: { scheduledAt: true, startedAt: true, completedAt: true },
    });
    
    // Generar slots de 30 minutos desde las 6:00 hasta las 23:30
    const slots = [];
    const slotDuration = 30 * 60 * 1000; // 30 minutos en milisegundos
    
    for (let hour = 6; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, minute, 0, 0);
        
        const slotEnd = new Date(slotStart.getTime() + slotDuration);
        
        // Verificar si el slot está ocupado
        const isReserved = reservations.some(reservation => 
          slotStart < reservation.endTime && slotEnd > reservation.startTime
        );
        
        const isInMaintenance = maintenanceSchedules.some(m => {
          const maintStart = m.startedAt ?? m.scheduledAt ?? startOfDay;
          const maintEnd = m.completedAt ?? endOfDay;
          return slotStart < maintEnd && slotEnd > maintStart;
        });
        
        slots.push({
          start: slotStart,
          end: slotEnd,
          available: !isReserved && !isInMaintenance,
        });
      }
    }
    
    const hasAvailableSlots = slots.some(slot => slot.available);
    
    return {
      available: hasAvailableSlots,
      slots,
    };
  }
}

export const reservationService = new ReservationService();