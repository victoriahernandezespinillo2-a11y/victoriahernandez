import { db, type Reservation, type Court, type User } from '@repo/db';
import { z } from 'zod';
import { PricingService } from './pricing.service';
import { NotificationService } from '@repo/notifications';
import { PaymentService } from '@repo/payments';
import { reservationLockService } from './reservation-lock.service';
import { ScheduleCompatibilityService } from './schedule-compatibility.service';
import { PaymentMethodSchema } from '../validators/reservation.validator';
import { createHash } from 'crypto';
import { ValidationAppError, NotFoundAppError } from '../errors';
import {
  resolveMaxAdvanceDays,
  validateWithinAdvanceWindow,
  exceedsMaxAdvance,
} from '../utils/booking-settings';
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
  // paymentMethod acepta todos los métodos válidos (usuario y admin)
  // La validación específica se hace en cada endpoint según el contexto
  paymentMethod: PaymentMethodSchema.optional(),
  notes: z.string().optional(),
  // Nueva bandera: selección de iluminación por el usuario
  lightingSelected: z.boolean().optional(),
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
    console.log('🏗️ [RESERVATION-SERVICE] Iniciando createReservation:', input);
    const validatedInput = CreateReservationSchema.parse(input);
    
    const startTime = new Date(validatedInput.startTime);
    const endTime = new Date(startTime.getTime() + validatedInput.duration * 60000);

    const courtRef = await db.court.findUnique({
      where: { id: validatedInput.courtId },
      select: {
        id: true,
        center: {
          select: {
            settings: true,
            timezone: true,
          },
        },
      },
    });

    if (!courtRef) {
      throw new NotFoundAppError('Cancha no encontrada');
    }

    const centerSettings = (courtRef.center?.settings as any) || {};
    const maxAdvanceDays = resolveMaxAdvanceDays(centerSettings);
    const now = new Date();

    if (startTime.getTime() < now.getTime()) {
      throw new ValidationAppError('La fecha seleccionada ya ha pasado');
    }

    if (!validateWithinAdvanceWindow(startTime, now, maxAdvanceDays)) {
      throw new ValidationAppError(`Las reservas solo pueden realizarse con hasta ${maxAdvanceDays} días de antelación`);
    }

    // 🔒 PASO 1: Intentar adquirir bloqueo temporal
    const lockAcquired = await reservationLockService.acquireLock(
      validatedInput.courtId,
      startTime,
      endTime,
      validatedInput.userId
    );

    if (!lockAcquired) {
      throw new Error('El horario está siendo procesado por otro usuario. Intenta nuevamente en unos segundos.');
    }

    let reservation!: Reservation;
    try {
      // Calcular precio fuera de la transacción (solo lecturas)
      const computedPrice = await this.pricingService.calculatePrice({
        courtId: validatedInput.courtId,
        startTime: startTime,
        duration: validatedInput.duration,
        userId: validatedInput.userId,
        lightingSelected: validatedInput.lightingSelected,
      });
      
      console.log('💰 [RESERVATION-PRICE] Precio calculado:', {
        courtId: validatedInput.courtId,
        duration: validatedInput.duration,
        subtotal: computedPrice.subtotal,
        discount: computedPrice.discount,
        total: computedPrice.total,
        breakdown: computedPrice.breakdown
      });

      // Operaciones críticas dentro de transacción con mayor timeout
      reservation = await (db as any).$transaction(async (tx: any) => {
        // 🔍 LOGGING DE DEBUGGING
        console.log(`🔍 [RESERVATION-CREATE] Iniciando validaciones para usuario ${validatedInput.userId}:`, {
          courtId: validatedInput.courtId,
          startTime: startTime.toISOString(),
          duration: validatedInput.duration,
          endTime: endTime.toISOString(),
          timestamp: new Date().toISOString()
        });

        // 0) Advisory lock a nivel de BD para blindaje multi-instancia (clave derivada de cancha+franja)
        // Usar SHA-256 en lugar de MD5 para mayor seguridad criptográfica
        const advisoryKey = `reservation:${validatedInput.courtId}:${startTime.toISOString()}:${endTime.toISOString()}`;
        
        // Generar hash SHA-256 y extraer dos enteros de 32 bits
        const hash = createHash('sha256').update(advisoryKey).digest('hex');
        const MAX_INT32 = 2147483647; // rango int4 PG (-2^31..2^31-1)
        const toInt32 = (hexPart: string) => {
          const n = parseInt(hexPart, 16) % MAX_INT32;
          // Convertir a firmado si excede 2^31-1
          return n > MAX_INT32 ? n - MAX_INT32 * 2 : n;
        };
        const lockKey1 = toInt32(hash.substring(0, 8));
        const lockKey2 = toInt32(hash.substring(8, 16));
        
        console.log('[ADVISORY_LOCK] Intentando adquirir lock:', {
          advisoryKey,
          lockKey1,
          lockKey2,
          hash: hash.substring(0, 16),
          timestamp: new Date().toISOString()
        });
        
        const lockRows = await (tx as any).$queryRaw<{ locked: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(${lockKey1}::int4, ${lockKey2}::int4) as locked
        `;
        
        const locked = Array.isArray(lockRows) && lockRows[0] && (lockRows[0] as any).locked === true;
        
        if (!locked) {
          // Falla rápido si otra transacción ya está procesando la misma cancha y franja
          console.warn('[ADVISORY_LOCK] Lock no adquirido - conflicto de concurrencia:', {
            advisoryKey,
            lockKey1,
            lockKey2,
            timestamp: new Date().toISOString()
          });
          throw new Error('El horario está siendo procesado por otro usuario. Intenta nuevamente en unos segundos.');
        }
        
        console.log('[ADVISORY_LOCK] Lock adquirido exitosamente:', {
          advisoryKey,
          lockKey1,
          lockKey2,
          timestamp: new Date().toISOString()
        });

        // 1) Verificar disponibilidad al momento de crear
        await this.checkAvailability(tx, {
          courtId: validatedInput.courtId,
          startTime: startTime,
          endTime: endTime,
        });

        // 1b) Verificar conflicto para el mismo usuario en ventana de tiempo
        await this.checkUserConflict(tx, {
          userId: validatedInput.userId,
          startTime: startTime,
          endTime: endTime,
        });

        console.log(`✅ [RESERVATION-CREATE] Validaciones aprobadas, creando reserva...`);

        // 2) Crear reserva principal con timeout automático
        const now = new Date();
        
        // Lógica de expiración diferenciada por método de pago
        const getExpirationTime = (paymentMethod: string | undefined, startTime: Date) => {
          // Si no hay método de pago definido (reservas manuales de admin), 
          // usar tiempo de inicio como expiración (se marcará como PAID antes de expirar)
          if (!paymentMethod) {
            return new Date(startTime.getTime());
          }
          
          if (paymentMethod === 'ONSITE') {
            // Pago en sede: 1 hora antes de la reserva
            return new Date(startTime.getTime() - 60 * 60 * 1000);
          }
          // Otros métodos: 15 minutos desde ahora
          return new Date(now.getTime() + 15 * 60 * 1000);
        };
        
        const expiresAt = getExpirationTime(validatedInput.paymentMethod, startTime);
        
        console.log('💾 [RESERVATION-CREATE] Guardando reserva con precio:', {
          totalPrice: computedPrice.total,
          totalPriceType: typeof computedPrice.total,
          computedPriceObject: computedPrice
        });
        
        const created = await tx.reservation.create({
          data: {
            courtId: validatedInput.courtId,
            userId: validatedInput.userId,
            startTime: startTime,
            endTime: endTime,
            totalPrice: computedPrice.total,
            lightingSelected: (computedPrice as any)?.lighting?.selected ?? false,
            lightingExtraTotal: Number((computedPrice as any)?.lighting?.extra ?? 0),
            status: 'PENDING',
            expiresAt: expiresAt,
            isRecurring: validatedInput.isRecurring,
            // Para reservas manuales de admin, paymentMethod se define después del procesamiento de pago
            // Para reservas de usuarios, se especifica al momento de crear la reserva
            paymentMethod: validatedInput.paymentMethod || null,
            notes: validatedInput.notes,
          },
        });
        
        console.log('✅ [RESERVATION-CREATED] Reserva guardada:', {
          id: created.id,
          totalPrice: created.totalPrice,
          totalPriceType: typeof created.totalPrice
        });

        // 3) Crear reservas recurrentes si es necesario (sigue dentro de la transacción)
        if (validatedInput.isRecurring && validatedInput.recurringPattern) {
          await this.createRecurringReservations(tx, created, validatedInput.recurringPattern, maxAdvanceDays, now);
        }

        return created as Reservation;
      }, { timeout: 15000 });

      // 🔓 PASO 2: Liberar bloqueo después de transacción exitosa
      await reservationLockService.releaseLock(
        validatedInput.courtId,
        startTime,
        endTime,
        validatedInput.userId
      );

      // 4) Registrar evento asíncrono fuera de la transacción para no prolongarla
      try {
        await db.outboxEvent.create({
          data: {
            // Evento de reserva pendiente, a la espera de confirmación de pago
            eventType: 'RESERVATION_PENDING',
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
    } catch (error: any) {
      // 🔓 PASO 3: Liberar bloqueo en caso de error
      await reservationLockService.releaseLock(
        validatedInput.courtId,
        startTime,
        endTime,
        validatedInput.userId
      );
      // Mapear violación de exclusión (solape de horario) a un mensaje de negocio claro
      const msg = typeof error?.message === 'string' ? error.message : '';
      if (msg.includes('23P01') || /exclusion constraint/i.test(msg) || /overlap/i.test(msg)) {
        throw new Error('Horario no disponible');
      }
      // Re-lanzar el error original si no coincide
      throw error;
    }

    // Se omite el envío de confirmación en creación de reserva. El correo con QR se enviará tras la confirmación del pago en el webhook.

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
    // Excluir reservas PENDING que han expirado
    const now = new Date();
    const conflictingReservations = await tx.reservation.findMany({
      where: {
        courtId,
        OR: [
          {
            // Reservas PAID o IN_PROGRESS (siempre bloquean)
            status: { in: ['PAID', 'IN_PROGRESS'] },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
          {
            // Reservas PENDING que NO han expirado
            status: 'PENDING',
            OR: [
              { expiresAt: null }, // Reservas antiguas sin expiresAt
              { expiresAt: { gt: now } }, // Reservas que aún no han expirado
            ],
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        ],
      },
    });
    
    if (conflictingReservations.length > 0) {
      console.log('🚨 [CONFLICT-DEBUG] Conflictos encontrados:', {
        courtId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        conflictingReservations: conflictingReservations.map((r: any) => ({
          id: r.id,
          status: r.status,
          startTime: r.startTime,
          endTime: r.endTime,
          expiresAt: r.expiresAt
        })),
        timestamp: new Date().toISOString()
      });
      throw new Error('Horario no disponible');
    }
    
    // Verificar mantenimiento programado (solo los que se solapan con el horario solicitado)
    const maintenanceSchedules = await tx.maintenanceSchedule.findMany({
      where: {
        courtId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        OR: [
          // Mantenimientos programados que empiezan durante el horario solicitado
          { scheduledAt: { gte: startTime, lt: endTime } },
          // Mantenimientos en progreso que terminan durante el horario solicitado
          {
            AND: [
              { startedAt: { not: null } },
              { startedAt: { lt: endTime } },
              { completedAt: { gt: startTime } }
            ]
          }
        ],
      },
      select: { id: true, scheduledAt: true, estimatedDuration: true },
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
    // 🔒 VALIDACIÓN MEJORADA: Solo verificar conflictos en el mismo día
    const startOfDay = new Date(startTime);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(startTime);
    endOfDay.setHours(23, 59, 59, 999);
    
    const conflicts = await tx.reservation.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'PAID', 'IN_PROGRESS'] },
        // Solo verificar reservas en el mismo día
        startTime: { gte: startOfDay, lte: endOfDay },
        // Verificar solapamiento real de horarios
        OR: [
          // Caso 1: La nueva reserva empieza durante una existente
          { startTime: { lte: startTime }, endTime: { gt: startTime } },
          // Caso 2: La nueva reserva termina durante una existente
          { startTime: { lt: endTime }, endTime: { gte: endTime } },
          // Caso 3: La nueva reserva envuelve completamente una existente
          { startTime: { gte: startTime }, endTime: { lte: endTime } }
        ],
      },
      select: { 
        id: true, 
        startTime: true, 
        endTime: true,
        status: true 
      },
    });
    
    if (conflicts.length > 0) {
      // 🔍 LOGGING DETALLADO PARA DEBUGGING
      console.log(`🚨 [USER-CONFLICT] Usuario ${userId} tiene ${conflicts.length} conflicto(s):`, {
        requestedTime: { start: startTime, end: endTime },
        conflicts: conflicts.map((c: { id: string; startTime: Date; endTime: Date; status: string }) => ({
          id: c.id,
          start: c.startTime,
          end: c.endTime,
          status: c.status
        })),
        timestamp: new Date().toISOString()
      });
      
      throw new Error('El usuario ya tiene una reserva en ese horario');
    }
  }

  /**
   * Crear reservas recurrentes
   */
  private async createRecurringReservations(
    tx: any,
    parentReservation: Reservation,
    pattern: NonNullable<CreateReservationInput['recurringPattern']>,
    maxAdvanceDays: number,
    referenceDate: Date
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
          if (exceedsMaxAdvance(reservationStart, referenceDate, maxAdvanceDays)) {
            console.info('[RECURRING-RESERVATION] Fecha omitida por exceder maxAdvanceDays', {
              reservationStart,
              maxAdvanceDays,
            });
            continue;
          }

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
                status: 'PENDING',
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
    
    try {
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
    } catch (error: any) {
      const msg = typeof error?.message === 'string' ? error.message : '';
      if (msg.includes('23P01') || /exclusion constraint/i.test(msg) || /overlap/i.test(msg)) {
        throw new Error('Horario no disponible');
      }
      throw error;
    }
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

      // 🚀 ENTERPRISE: Horarios por día usando servicio de compatibilidad
      const weekday = date.getDay(); // 0: domingo ... 6: sábado
      const daySlots = ScheduleCompatibilityService.getDaySchedule(settings, weekday);
      
      if (daySlots.length === 0) {
        // Centro cerrado
        dayRanges = [];
      } else {
        // Convertir slots a formato esperado
        dayRanges = daySlots.map(slot => ({ start: slot.start, end: slot.end }));
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
    
    // Obtener mantenimientos relevantes del día (solo los que se solapan con este día específico)
    const maintenanceSchedules = await db.maintenanceSchedule.findMany({
      where: {
        courtId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        OR: [
          // Mantenimientos programados que empiezan en este día
          { scheduledAt: { gte: startOfDay, lte: endOfDay } },
          // Mantenimientos en progreso que terminan en este día
          { 
            AND: [
              { startedAt: { not: null } },
              { startedAt: { lte: endOfDay } },
              { completedAt: { gte: startOfDay } }
            ]
          },
          // Mantenimientos completados que terminaron en este día
          { 
            AND: [
              { completedAt: { not: null } },
              { completedAt: { gte: startOfDay, lte: endOfDay } }
            ]
          }
        ],
      },
      select: { scheduledAt: true, startedAt: true, completedAt: true, estimatedDuration: true },
    });
    
    // Si el día está cerrado o no hay rangos configurados -> sin disponibilidad
    const slots: Array<{ start: Date; end: Date; available: boolean }> = [];
    if (dayRanges.length === 0) {
      return { available: false, slots };
    }

    const slotDuration = slotMinutes * 60 * 1000;

    for (const range of dayRanges) {
      const startParts = String(range.start).split(':').map((n) => Number(n));
      const endParts = String(range.end).split(':').map((n) => Number(n));
      const [startH = 0, startM = 0] = startParts;
      const [endH = 0, endM = 0] = endParts;
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
            // Usar estimatedDuration de la base de datos, con fallback a 2 horas (120 minutos)
            const durationMinutes = m.estimatedDuration || 120;
            const maintEnd = m.completedAt ?? new Date(maintStart.getTime() + durationMinutes * 60 * 1000);
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
