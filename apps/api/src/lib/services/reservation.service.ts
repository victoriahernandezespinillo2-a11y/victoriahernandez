import { db, type Reservation, type Court, type User } from '@repo/db';
import { z } from 'zod';
import { PricingService } from './pricing.service';
import { NotificationService } from '@repo/notifications';
import { PaymentService } from '@repo/payments';
// Importar qrcode dinámicamente donde se usa para evitar error de tipos en compilación

// Esquemas de validación
export const CreateReservationSchema = z.object({
  courtId: z.string().min(1, 'courtId requerido'),
  userId: z.string().min(1, 'userId requerido'),
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

      // 1b) Verificar conflicto para el mismo usuario en ventana de tiempo
      await this.checkUserConflict(tx, {
        userId: validatedInput.userId,
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

    // 5) Enviar confirmación (email/SMS) usando notificador real; tolerar fallos sin romper flujo
    try {
      const user = await db.user.findUnique({ where: { id: reservation.userId } });
      const court = await db.court.findUnique({ where: { id: reservation.courtId } });
      if (user && (user.email || user.phone) && court) {
        // Generar QR con token firmado para check-in
        const tokenPayload = { reservationId: reservation.id };
        const jwtMod = (await import('jsonwebtoken')) as unknown as typeof import('jsonwebtoken');
        const jwtToken = jwtMod.sign(
          tokenPayload,
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '3h' }
        );
        const QRCode = (await import('qrcode')) as unknown as { toDataURL: (text: string, opts?: any) => Promise<string> };
        const qrDataUrl = await QRCode.toDataURL(jwtToken, { width: 256 });

        // Generar ICS
        const dtStart = reservation.startTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const dtEnd = reservation.endTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Polideportivo//EN\nBEGIN:VEVENT\nUID:${reservation.id}\nDTSTAMP:${dtStart}\nDTSTART:${dtStart}\nDTEND:${dtEnd}\nSUMMARY:Reserva ${court.name}\nEND:VEVENT\nEND:VCALENDAR`;

        const variables = {
          userName: user.name || 'Usuario',
          courtName: court.name,
          date: reservation.startTime.toLocaleDateString('es-ES'),
          startTime: reservation.startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          endTime: reservation.endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          duration: String(Math.round((reservation.endTime.getTime() - reservation.startTime.getTime()) / 60000)),
          price: String(Number(reservation.totalPrice || 0)),
          reservationCode: reservation.id.slice(0, 8).toUpperCase(),
        } as Record<string, string>;
        const email = await (await import('@repo/notifications')).emailService.sendEmail({
          to: user.email!,
          subject: `Confirmación de reserva - ${court.name}`,
          html: (await (await import('@repo/notifications')).emailService.getTemplate('reservationConfirmation', variables))!.html,
          attachments: [
            { filename: 'reserva.ics', content: ics, contentType: 'text/calendar' },
            { filename: 'qr.png', content: Buffer.from(qrDataUrl.split(',')[1], 'base64'), contentType: 'image/png' },
          ],
        });
      }
    } catch (e) {
      console.warn('No se pudo enviar confirmación de reserva:', e);
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
   * Verificar que el usuario no tenga otra reserva solapada en el mismo rango
   */
  private async checkUserConflict(
    tx: any,
    { userId, startTime, endTime }: { userId: string; startTime: Date; endTime: Date }
  ): Promise<void> {
    const conflicts = await tx.reservation.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'PAID', 'IN_PROGRESS'] },
        OR: [
          { startTime: { lt: endTime }, endTime: { gt: startTime } },
        ],
      },
      select: { id: true },
    });
    if (conflicts.length > 0) {
      throw new Error('El usuario ya tiene una reserva en ese horario');
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
        ...(status && { status: (status.toUpperCase() as any) }),
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
    
    return await db.$transaction(async (tx: any) => {
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
    return await db.$transaction(async (tx: any) => {
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
      
      if (reservation.status === 'CANCELLED') {
        throw new Error('La reserva ya está cancelada');
      }
      
      const updatedReservation = await tx.reservation.update({
        where: { id },
        data: {
          status: 'CANCELLED',
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
        status: 'IN_PROGRESS',
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
        status: 'COMPLETED',
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

    // Obtener configuración de horarios desde el centro
    const courtRef = await db.court.findUnique({
      where: { id: courtId },
      select: { centerId: true },
    });

    let slotMinutes = 30;
    let dayRanges: Array<{ start: string; end: string }> = [{ start: '06:00', end: '23:00' }];

    if (courtRef?.centerId) {
      const center = await db.center.findUnique({
        where: { id: courtRef.centerId },
        select: { settings: true },
      });

      const settings: any = center?.settings || {};
      // Compatibilidad: permitir settings.booking.slotMinutes o settings.slot.minutes
      if (typeof settings?.booking?.slotMinutes === 'number') {
        slotMinutes = Math.max(5, Math.min(240, Math.floor(settings.booking.slotMinutes)));
      } else if (typeof settings?.slot?.minutes === 'number') {
        slotMinutes = Math.max(5, Math.min(240, Math.floor(settings.slot.minutes)));
      }

      // Horarios por día (operatingHours: monday..sunday { open, close, closed })
      const oh = settings?.operatingHours;
      if (oh && typeof oh === 'object') {
        const weekday = date.getDay(); // 0: domingo ... 6: sábado
        const map: Record<number, string> = {
          0: 'sunday',
          1: 'monday',
          2: 'tuesday',
          3: 'wednesday',
          4: 'thursday',
          5: 'friday',
          6: 'saturday',
        };
        const key = map[weekday];
        const config = (oh as any)[key];
        if (config?.closed === true) {
          dayRanges = [];
        } else if (config?.open && config?.close) {
          dayRanges = [{ start: config.open, end: config.close }];
        }
      }

      // Excepciones opcionales: settings.exceptions: [{ date: 'YYYY-MM-DD', closed?: true, ranges?: [{start,end}]}]
      const exceptions = Array.isArray(settings?.exceptions) ? settings.exceptions : [];
      if (exceptions.length > 0) {
        const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const ex = exceptions.find((e: any) => e?.date === ymd);
        if (ex) {
          if (ex.closed === true) {
            dayRanges = [];
          } else if (Array.isArray(ex.ranges) && ex.ranges.length > 0) {
            // Validar formato básico HH:MM
            dayRanges = ex.ranges
              .filter((r: any) => typeof r?.start === 'string' && typeof r?.end === 'string')
              .map((r: any) => ({ start: r.start, end: r.end }));
          }
        }
      }
    }
    
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
    
    // Si el día está cerrado o no hay rangos configurados -> sin disponibilidad
    const slots: Array<{ start: Date; end: Date; available: boolean }> = [];
    if (dayRanges.length === 0) {
      return { available: false, slots };
    }

    const slotDuration = slotMinutes * 60 * 1000;

    for (const range of dayRanges) {
      const [startH, startM] = String(range.start).split(':').map((n) => Number(n));
      const [endH, endM] = String(range.end).split(':').map((n) => Number(n));
      if (
        Number.isFinite(startH) && Number.isFinite(startM) &&
        Number.isFinite(endH) && Number.isFinite(endM)
      ) {
        const rangeStart = new Date(date);
        rangeStart.setHours(startH, startM, 0, 0);
        const rangeEnd = new Date(date);
        rangeEnd.setHours(endH, endM, 0, 0);

        let cursor = new Date(rangeStart);
        while (new Date(cursor.getTime() + slotDuration) <= rangeEnd) {
          const slotStart = new Date(cursor);
          const slotEnd = new Date(cursor.getTime() + slotDuration);

          // Verificar conflictos con reservas
          const isReserved = reservations.some((reservation) =>
            slotStart < reservation.endTime && slotEnd > reservation.startTime
          );

          // Verificar conflictos de mantenimiento
          const isInMaintenance = maintenanceSchedules.some((m: any) => {
            const maintStart = m.startedAt ?? m.scheduledAt ?? startOfDay;
            const maintEnd = m.completedAt ?? endOfDay;
            return slotStart < maintEnd && slotEnd > maintStart;
          });

          slots.push({
            start: slotStart,
            end: slotEnd,
            available: !isReserved && !isInMaintenance,
          });

          // avanzar al siguiente slot
          cursor = new Date(cursor.getTime() + slotDuration);
        }
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