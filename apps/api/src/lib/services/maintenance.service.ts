/**
 * Servicio de gestión de mantenimiento
 * Maneja programación, seguimiento y completado de tareas de mantenimiento
 */

import { db } from '@repo/db';
import { zonedTimeToUtc, utcToZonedTime, formatInTimeZone } from 'date-fns-tz';
// Local addDays helper to avoid external dependency issues
const addDays = (date: Date, days: number): Date => {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};
import { z } from 'zod';
import { NotificationService } from '@repo/notifications';

// Esquemas de validación
const CreateMaintenanceBase = z.object({
  courtId: z.string().cuid('ID de cancha inválido'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  scheduledAt: z.string().datetime('Fecha programada inválida'),
  assignedTo: z.string().cuid('ID de técnico inválido').optional(),
  instructor: z.string().min(2, 'Nombre del instructor debe tener al menos 2 caracteres').optional(),
  capacity: z.number().min(1, 'La capacidad debe ser al menos 1').max(1000, 'La capacidad no puede exceder 1000').optional(),
  requirements: z.string().optional(),
  isPublic: z.boolean().optional().default(true),
  cost: z.number().min(0).optional(),
  estimatedDuration: z.number().min(15).max(480).optional(), // 15 minutos a 8 horas
  notes: z.string().optional(),
});

export const CreateMaintenanceSchema = z.discriminatedUnion('activityType', [
  CreateMaintenanceBase.extend({
    activityType: z.literal('MAINTENANCE'),
    type: z.enum(['CLEANING', 'REPAIR', 'INSPECTION', 'RENOVATION'], {
      errorMap: () => ({ message: 'Tipo de mantenimiento inválido' }),
    }),
    activityCategory: z.string().min(2).optional(),
  }),
  CreateMaintenanceBase.extend({
    activityType: z.enum(['TRAINING', 'CLASS', 'WARMUP', 'EVENT', 'MEETING', 'OTHER']),
    activityCategory: z.string().min(2, 'La categoría debe tener al menos 2 caracteres'),
    type: z.string().optional(),
  }),
]);

// Recurrencia semanal opcional
const RecurrenceSchema = z.object({
  type: z.literal('WEEKLY').default('WEEKLY'),
  startDate: z.string().date('Fecha de inicio inválida'),
  endDate: z.string().date('Fecha de fin inválida'),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).nonempty('Seleccione al menos un día'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/,'Hora inicio HH:mm'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/,'Hora fin HH:mm'),
  timezone: z.string().optional(),
  skipHolidays: z.boolean().optional().default(true),
  skipConflicts: z.boolean().optional().default(true),
}).refine((r) => r.startTime < r.endTime, { message: 'Hora fin debe ser mayor a inicio' });

export const UpdateMaintenanceSchema = z.object({
  type: z.enum(['CLEANING', 'REPAIR', 'INSPECTION', 'RENOVATION']).optional(),
  activityType: z.enum(['MAINTENANCE', 'TRAINING', 'CLASS', 'WARMUP', 'EVENT', 'MEETING', 'OTHER']).optional(),
  activityCategory: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  assignedTo: z.string().cuid().optional(),
  instructor: z.string().min(2).optional(),
  capacity: z.number().min(1).max(1000).optional(),
  requirements: z.string().optional(),
  isPublic: z.boolean().optional(),
  cost: z.number().min(0).optional(),
  estimatedDuration: z.number().min(15).max(480).optional(),
  notes: z.string().optional(),
});

export const CompleteMaintenanceSchema = z.object({
  actualCost: z.number().min(0, 'El costo real no puede ser negativo').optional(),
  completionNotes: z.string().min(3, 'Notas demasiado cortas').optional(),
  nextMaintenanceDate: z.string().datetime().optional(),
});

export const GetMaintenanceSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  courtId: z.string().optional(),
  centerId: z.string().optional(),
  type: z.enum(['CLEANING', 'REPAIR', 'INSPECTION', 'RENOVATION']).optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  assignedTo: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['scheduledAt', 'createdAt', 'type', 'status']).default('scheduledAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export class MaintenanceService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Crear una nueva tarea de mantenimiento
   */
  async createMaintenance(data: any) {
    // Soportar creación simple y con recurrencia
    const { recurrence, ...rest } = (data || {}) as any;
    const validatedData = CreateMaintenanceSchema.parse(rest);

    // Verificar que la cancha existe
    const court = await db.court.findUnique({
      where: { id: validatedData.courtId },
      include: {
        center: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!court) {
      throw new Error('Cancha no encontrada');
    }

    // Verificar que el técnico existe (si se asigna)
    if (validatedData.assignedTo) {
      const technician = await db.user.findUnique({
        where: {
          id: validatedData.assignedTo,
          role: { in: ['STAFF', 'ADMIN'] },
        },
      });

      if (!technician) {
        throw new Error('Técnico no encontrado o no válido');
      }
    }

    // Si no hay recurrencia -> crear único
    if (!recurrence) {
      const scheduledAt = new Date(validatedData.scheduledAt);
      const conflicts = await this.checkMaintenanceConflicts(validatedData.courtId, scheduledAt);
      if (conflicts.length > 0) throw new Error('Existe conflicto con otro mantenimiento programado');

      const dbType = validatedData.activityType === 'MAINTENANCE' ? (validatedData as any).type : 'INSPECTION';
      const maintenance = await db.maintenanceSchedule.create({
        data: {
          courtId: validatedData.courtId,
          type: dbType as any,
          activityType: validatedData.activityType,
          activityCategory: validatedData.activityCategory || undefined,
          description: validatedData.description,
          scheduledAt,
          assignedTo: validatedData.assignedTo || undefined,
          instructor: validatedData.instructor || undefined,
          capacity: validatedData.capacity || undefined,
          requirements: validatedData.requirements || undefined,
          isPublic: validatedData.isPublic,
          notes: validatedData.notes,
          cost: validatedData.cost as any,
          estimatedDuration: validatedData.estimatedDuration,
          status: 'SCHEDULED',
        },
      });
      return maintenance;
    }

    // Con recurrencia: expandir a ocurrencias
    const r = RecurrenceSchema.parse(recurrence);
    const seriesId = crypto.randomUUID();

    // Buscar TZ del centro
    const center = await db.center.findUnique({ where: { id: (court as any).centerId }, select: { settings: true, timezone: true } });
    console.log('📦 center record:', center);
    const tz = r.timezone || (center?.timezone as string) || ((center?.settings as any)?.timezone) || 'Europe/Madrid';

    console.log('📏 TZ selecionada para centro:', tz);

    const startUtcMidnight = zonedTimeToUtc(`${r.startDate}T00:00:00`, tz);
    const endUtcMidnight   = zonedTimeToUtc(`${r.endDate}T00:00:00`, tz);

    const addOneDay = (date: Date) => {
      const d = new Date(date.getTime());
      d.setUTCDate(d.getUTCDate() + 1);
      return d;
    };

    const days = new Set(r.daysOfWeek);

    // Leer excepciones del centro
    const settings: any = (center?.settings as any) || {};
    const exceptions: Array<{ date: string; closed?: boolean; ranges?: Array<{ start: string; end: string }> }> = Array.isArray(settings?.exceptions) ? settings.exceptions : [];

    const toUtc = (localYmd: string, hhmm: string) => zonedTimeToUtc(`${localYmd}T${hhmm}:00`, tz);

    const created: any[] = [];
    
    // Iterar semana por semana en lugar de día por día
    for (let cur = new Date(startUtcMidnight); cur <= endUtcMidnight; cur = addDays(cur, 7)) {
      // Para cada semana, verificar todos los días de la semana solicitados
      for (const dayOfWeek of days) {
        // Calcular el día específico de la semana
        const daysToAdd = dayOfWeek === 7 ? 0 : dayOfWeek; // Domingo = 0, Lunes = 1, etc.
        const targetDate = new Date(cur);
        targetDate.setUTCDate(targetDate.getUTCDate() + (daysToAdd - (targetDate.getUTCDay() === 0 ? 7 : targetDate.getUTCDay())));
        
        // Verificar que la fecha calculada esté dentro del rango
        if (targetDate < startUtcMidnight || targetDate > endUtcMidnight) continue;
        
        const localDate = utcToZonedTime(targetDate, tz);
        const ymd = formatInTimeZone(localDate, tz, 'yyyy-MM-dd');
        const ex = exceptions.find((e: any) => e?.date === ymd);
        if (r.skipHolidays && ex?.closed === true) continue;

        const ranges = ex?.ranges && ex.ranges.length > 0 ? ex.ranges : [{ start: r.startTime, end: r.endTime }];
        for (const rng of ranges) {
          const sUtc = toUtc(ymd, rng.start);
          const eUtc = toUtc(ymd, rng.end);
          if (eUtc <= sUtc) continue;

          // Conflictos (1h ventana alrededor del inicio)
          const conflicts = await this.checkMaintenanceConflicts(validatedData.courtId, sUtc);
          if (conflicts.length > 0 && r.skipConflicts) continue;

          // Verificar si ya existe un registro para esta fecha (prevenir duplicados)
          const existingRecord = await db.maintenanceSchedule.findFirst({
            where: {
              seriesId,
              scheduledAt: sUtc,
              courtId: validatedData.courtId,
            }
          });

          if (existingRecord) {
            console.log('⚠️ [RECURRENCE] Registro ya existe, saltando:', {
              id: existingRecord.id,
              date: ymd,
            });
            continue;
          }

          const dbType = validatedData.activityType === 'MAINTENANCE' ? (validatedData as any).type : 'INSPECTION';
          // En recurrencia, la duración debe venir de la franja start/end definida para esa ocurrencia
          const dur = Math.round((eUtc.getTime() - sUtc.getTime()) / 60000);
          const rec = await db.maintenanceSchedule.create({
            data: {
              courtId: validatedData.courtId,
              type: dbType as any,
              activityType: validatedData.activityType,
              activityCategory: validatedData.activityCategory || undefined,
              description: validatedData.description,
              scheduledAt: sUtc,
              assignedTo: validatedData.assignedTo || undefined,
              instructor: validatedData.instructor || undefined,
              capacity: validatedData.capacity || undefined,
              requirements: validatedData.requirements || undefined,
              isPublic: validatedData.isPublic,
              notes: validatedData.notes,
              cost: validatedData.cost as any,
              estimatedDuration: dur,
              status: conflicts.length > 0 ? ('CONFLICT' as any) : 'SCHEDULED',
              seriesId,
              // Guardar metadatos básicos de recurrencia para edición/visualización futura
              // (no estrictamente necesario para funcionamiento, pero útil para UI)
            },
          });
          console.log('🆕 [RECURRENCE] Ocurrencia creada', {
            localYMD: ymd,
            startLocal: `${ymd} ${rng.start}`,
            endLocal: `${ymd} ${rng.end}`,
            scheduledAtUTC: rec.scheduledAt.toISOString(),
            durationMin: dur,
          });
          created.push(rec);
        }
      }
    }

    return { seriesId, created: created.length };
  }

  /**
   * Obtener tareas de mantenimiento con filtros
   */
  async getMaintenance(params: z.infer<typeof GetMaintenanceSchema>) {
    const {
      page,
      limit,
      courtId,
      centerId,
      type,
      status,
      assignedTo,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = GetMaintenanceSchema.parse(params);

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {};

    if (courtId) {
      where.courtId = courtId;
    }

    if (centerId) {
      where.court = { centerId } as any;
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    if (startDate || endDate) {
      (where as any).scheduledAt = {} as any;
      if (startDate) (where as any).scheduledAt.gte = new Date(startDate);
      if (endDate) (where as any).scheduledAt.lte = new Date(endDate);
    }

    // Obtener mantenimientos y total
    let maintenances: any[] = [];
    let total = 0;
    try {
      [maintenances, total] = await Promise.all([
        db.maintenanceSchedule.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          // Seleccionar solo columnas existentes para evitar errores si la DB aún no está migrada
          select: {
            id: true,
            courtId: true,
            type: true,
            activityType: true,
            activityCategory: true,
            status: true,
            scheduledAt: true,
            startedAt: true,
            completedAt: true,
            description: true,
            notes: true,
            cost: true,
            assignedTo: true,
            createdAt: true,
            updatedAt: true,
            estimatedDuration: true,
            seriesId: true,
            // Relaciones
            court: {
              select: {
                id: true,
                name: true,
                sportType: true,
                center: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        }),
        db.maintenanceSchedule.count({ where }),
      ]);
    } catch (primaryErr) {
      console.warn('[MAINT] Fallback simple query por error en select extendido:', primaryErr);
      // Fallback minimalista para no romper el Admin si hay desalineación de esquema
      [maintenances, total] = await Promise.all([
        db.maintenanceSchedule.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            courtId: true,
            type: true,
            activityType: true,
            activityCategory: true,
            status: true,
            scheduledAt: true,
            estimatedDuration: true,
            seriesId: true,
          },
        }),
        db.maintenanceSchedule.count({ where }),
      ]);
    }

    return {
      maintenances,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener mantenimiento por ID
   */
  async getMaintenanceById(id: string) {
    const maintenance = await db.maintenanceSchedule.findUnique({
      where: { id },
      include: {
        court: {
          select: {
            id: true,
            name: true,
            sportType: true,
            center: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
    });

    if (!maintenance) {
      throw new Error('Mantenimiento no encontrado');
    }

    return maintenance;
  }

  /**
   * Actualizar mantenimiento
   */
  async updateMaintenance(id: string, data: z.infer<typeof UpdateMaintenanceSchema>) {
    const validatedData = UpdateMaintenanceSchema.parse(data);

    const maintenance = await db.maintenanceSchedule.findUnique({
      where: { id },
    });

    if (!maintenance) {
      throw new Error('Mantenimiento no encontrado');
    }

    // Verificar que no esté completado
    if (maintenance.status === 'COMPLETED') {
      throw new Error('No se puede modificar un mantenimiento completado');
    }

    // Verificar conflictos si se cambia la fecha
    if (validatedData.scheduledAt) {
      const newScheduledAt = new Date(validatedData.scheduledAt);
      const conflicts = await this.checkMaintenanceConflicts(
        maintenance.courtId,
        newScheduledAt,
        id
      );

      if (conflicts.length > 0) {
        throw new Error('Existe conflicto con otro mantenimiento programado');
      }
    }

    const updatedMaintenance = await db.maintenanceSchedule.update({
      where: { id },
      data: {
        type: validatedData.type,
        description: validatedData.description,
        scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : undefined,
        status: validatedData.status,
        assignedTo: validatedData.assignedTo ?? undefined,
        cost: (validatedData.cost as any) ?? undefined,
        notes: validatedData.notes,
      },
      include: {
        court: {
          select: {
            id: true,
            name: true,
            sportType: true,
          },
        },
      },
    });

    return updatedMaintenance;
  }

  /**
   * Iniciar mantenimiento
   */
  async startMaintenance(id: string) {
    const maintenance = await db.maintenanceSchedule.findUnique({
      where: { id },
      include: {
        court: true,
      },
    });

    if (!maintenance) {
      throw new Error('Mantenimiento no encontrado');
    }

    if (maintenance.status !== 'SCHEDULED') {
      throw new Error('Solo se pueden iniciar mantenimientos programados');
    }

    const updatedMaintenance = await db.maintenanceSchedule.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    return updatedMaintenance;
  }

  /**
   * Completar mantenimiento
   */
  async completeMaintenance(id: string, data: z.infer<typeof CompleteMaintenanceSchema>) {
    const validatedData = CompleteMaintenanceSchema.parse(data);

    const maintenance = await db.maintenanceSchedule.findUnique({
      where: { id },
      include: {
        court: {
          include: {
            center: true,
          },
        },
        // assignedUser no existe en el include del modelo actual
      },
    });

    if (!maintenance) {
      throw new Error('Mantenimiento no encontrado');
    }

    if (maintenance.status === 'COMPLETED') {
      throw new Error('El mantenimiento ya está completado');
    }

    const completedMaintenance = await db.maintenanceSchedule.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        cost: (validatedData.actualCost as any) ?? undefined,
        notes: validatedData.completionNotes ?? undefined,
      },
    });

    // Programar próximo mantenimiento si se especifica
    if (validatedData.nextMaintenanceDate) {
      await this.createMaintenance({
        courtId: maintenance.courtId,
        type: 'INSPECTION',
        description: `Inspección programada automáticamente`,
        scheduledAt: validatedData.nextMaintenanceDate,
        assignedTo: maintenance.assignedTo ?? undefined,
      } as any);
    }

    return completedMaintenance;
  }

  /**
   * Cancelar mantenimiento
   */
  async cancelMaintenance(id: string, reason?: string) {
    const maintenance = await db.maintenanceSchedule.findUnique({
      where: { id },
    });

    if (!maintenance) {
      throw new Error('Mantenimiento no encontrado');
    }

    if (maintenance.status === 'COMPLETED') {
      throw new Error('No se puede cancelar un mantenimiento completado');
    }

    const cancelledMaintenance = await db.maintenanceSchedule.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${maintenance.notes || ''}\n\nCancelado: ${reason}` : maintenance.notes,
      },
    });

    return cancelledMaintenance;
  }

  /**
   * Eliminar mantenimiento completamente de la base de datos
   */
  async deleteMaintenance(id: string) {
    const maintenance = await db.maintenanceSchedule.findUnique({
      where: { id },
    });

    if (!maintenance) {
      throw new Error('Mantenimiento no encontrado');
    }

    if (maintenance.status === 'IN_PROGRESS') {
      throw new Error('No se puede eliminar un mantenimiento en progreso');
    }

    // Eliminar completamente de la base de datos
    const deletedMaintenance = await db.maintenanceSchedule.delete({
      where: { id },
    });

    // Registrar evento de eliminación
    await db.outboxEvent.create({
      data: {
        eventType: 'MAINTENANCE_DELETED',
        eventData: {
          maintenanceId: id,
          deletedAt: new Date().toISOString(),
          description: maintenance.description,
          courtId: maintenance.courtId
        } as any,
      },
    });

    return deletedMaintenance;
  }

  /**
   * Verificar conflictos de mantenimiento
   */
  private async checkMaintenanceConflicts(
    courtId: string,
    scheduledAt: Date,
    excludeId?: string
  ) {
    const windowStart = new Date(scheduledAt.getTime() - 60 * 60 * 1000);
    const windowEnd = new Date(scheduledAt.getTime() + 60 * 60 * 1000);
    const where: any = {
      courtId,
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      scheduledAt: { gte: windowStart, lte: windowEnd },
    };
    if (excludeId) where.id = { not: excludeId };
    return db.maintenanceSchedule.findMany({ where });
  }

  /**
   * Obtener estadísticas de mantenimiento
   */
  async getMaintenanceStats(centerId?: string) {
    const where = centerId ? { court: { centerId } } : {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, scheduled, inProgress, completed, overdue, monthlyCompleted] = await Promise.all([
      db.maintenanceSchedule.count({ where }),
      db.maintenanceSchedule.count({
        where: { ...where, status: 'SCHEDULED' },
      }),
      db.maintenanceSchedule.count({
        where: { ...where, status: 'IN_PROGRESS' },
      }),
      db.maintenanceSchedule.count({
        where: { ...where, status: 'COMPLETED' },
      }),
      db.maintenanceSchedule.count({
        where: {
          ...where,
          status: 'SCHEDULED',
          scheduledAt: { lt: now },
        },
      }),
      db.maintenanceSchedule.count({
        where: {
          ...where,
          status: 'COMPLETED',
          completedAt: { gte: startOfMonth },
        },
      }),
    ]);

    // Estadísticas por tipo
    const byType = await db.maintenanceSchedule.groupBy({
      by: ['type'],
      where,
      _count: { type: true },
    });

    return {
      total,
      scheduled,
      inProgress,
      completed,
      overdue,
      monthlyCompleted,
      byType: byType.map((item: any) => ({
        type: item.type,
        count: (item._count as any).type,
      })),
      // No hay prioridad en el esquema actual
    };
  }

  /**
   * Obtener mantenimientos próximos a vencer
   */
  async getUpcomingMaintenance(days = 7) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return db.maintenanceSchedule.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          gte: now,
          lte: futureDate,
        },
      },
      include: {
        court: {
          select: {
            id: true,
            name: true,
            center: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        // assignedUser relación no está definida en el esquema actual
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  /**
   * Infer recurrence rule and template from existing series occurrences
   */
  async inferSeriesRule(seriesId: string) {
    const occurrences = await db.maintenanceSchedule.findMany({
      where: { seriesId },
      orderBy: { scheduledAt: 'asc' },
      include: {
        court: { include: { center: true } },
      },
    });
    if (!occurrences || occurrences.length === 0) {
      throw new Error('Serie no encontrada');
    }
    const first = occurrences[0]!;
    const last = occurrences[occurrences.length - 1]!;
    const tz = (first as any).court?.center?.timezone || ((first as any).court?.center?.settings as any)?.timezone || 'Europe/Madrid';
    const startDate = formatInTimeZone(first.scheduledAt, tz, 'yyyy-MM-dd');
    const endDate = formatInTimeZone(last.scheduledAt, tz, 'yyyy-MM-dd');
    const minutes = (first.estimatedDuration || 60);
    const startTime = formatInTimeZone(first.scheduledAt, tz, 'HH:mm');
    const endTime = formatInTimeZone(new Date(first.scheduledAt.getTime() + minutes * 60000), tz, 'HH:mm');
    const days = Array.from(new Set(occurrences.map((o) => {
      const d = utcToZonedTime(o.scheduledAt, tz);
      const weekday = d.getDay() === 0 ? 7 : d.getDay();
      return weekday;
    }))).sort((a, b) => a - b);
    return {
      rule: {
        type: 'WEEKLY',
        startDate,
        endDate,
        daysOfWeek: days,
        startTime,
        endTime,
        timezone: tz,
        skipHolidays: true,
        skipConflicts: true,
      },
      template: {
        courtId: first.courtId,
        activityType: (first as any).activityType || 'MAINTENANCE',
        activityCategory: (first as any).activityCategory || undefined,
        type: first.type,
        description: first.description,
        isPublic: ((first as any)?.isPublic) ?? true,
        estimatedDuration: first.estimatedDuration || minutes,
        cost: (first as any)?.cost,
      },
    } as const;
  }

  /**
   * Regenerate future occurrences of a series using a new recurrence rule.
   * Keeps past/in-progress/completed occurrences intact.
   */
  async regenerateSeries(seriesId: string, data: { rule: z.infer<typeof RecurrenceSchema> }) {
    const { rule } = { rule: RecurrenceSchema.parse(data.rule) };
    // Get template and context
    const info = await this.inferSeriesRule(seriesId);
    const template = info.template as any;
    const tz = rule.timezone || info.rule.timezone || 'Europe/Madrid';

    // Delete only future SCHEDULED occurrences
    const now = new Date();
    await db.maintenanceSchedule.deleteMany({
      where: { seriesId, status: 'SCHEDULED', scheduledAt: { gte: now } },
    });

    // Build exceptions and center tz
    const court = await db.court.findUnique({ where: { id: template.courtId }, include: { center: true } });
    const settings: any = (court?.center?.settings as any) || {};
    const exceptions: Array<{ date: string; closed?: boolean; ranges?: Array<{ start: string; end: string }> }> = Array.isArray(settings?.exceptions) ? settings.exceptions : [];

    const startUtcMidnight = zonedTimeToUtc(`${rule.startDate}T00:00:00`, tz);
    const endUtcMidnight   = zonedTimeToUtc(`${rule.endDate}T00:00:00`, tz);
    const days = new Set(rule.daysOfWeek);
    const toUtc = (localYmd: string, hhmm: string) => zonedTimeToUtc(`${localYmd}T${hhmm}:00`, tz);
    const created: any[] = [];
    
    // Iterar semana por semana en lugar de día por día (mismo algoritmo que createMaintenance)
    for (let cur = new Date(startUtcMidnight); cur <= endUtcMidnight; cur = addDays(cur, 7)) {
      // Para cada semana, verificar todos los días de la semana solicitados
      for (const dayOfWeek of days) {
        // Calcular el día específico de la semana
        const daysToAdd = dayOfWeek === 7 ? 0 : dayOfWeek; // Domingo = 0, Lunes = 1, etc.
        const targetDate = new Date(cur);
        targetDate.setUTCDate(targetDate.getUTCDate() + (daysToAdd - (targetDate.getUTCDay() === 0 ? 7 : targetDate.getUTCDay())));
        
        // Verificar que la fecha calculada esté dentro del rango
        if (targetDate < startUtcMidnight || targetDate > endUtcMidnight) continue;
        
        const localDate = utcToZonedTime(targetDate, tz);
        const ymd = formatInTimeZone(localDate, tz, 'yyyy-MM-dd');
        const ex = exceptions.find((e: any) => e?.date === ymd);
        if (rule.skipHolidays && ex?.closed === true) continue;
        
        const ranges = ex?.ranges && ex.ranges.length > 0 ? ex.ranges : [{ start: rule.startTime, end: rule.endTime }];
        for (const rng of ranges) {
          const sUtc = toUtc(ymd, rng.start);
          const eUtc = toUtc(ymd, rng.end);
          if (eUtc <= sUtc) continue;
          
          const conflicts = await this.checkMaintenanceConflicts(template.courtId, sUtc);
          if (conflicts.length > 0 && rule.skipConflicts) continue;
          
          // Verificar si ya existe un registro para esta fecha (prevenir duplicados)
          const existingRecord = await db.maintenanceSchedule.findFirst({
            where: {
              seriesId,
              scheduledAt: sUtc,
              courtId: template.courtId,
            }
          });

          if (existingRecord) {
            console.log('⚠️ [REGENERATE] Registro ya existe, saltando:', {
              id: existingRecord.id,
              date: ymd,
            });
            continue;
          }
          
          const dur = Math.round((eUtc.getTime() - sUtc.getTime()) / 60000);
          const rec = await db.maintenanceSchedule.create({
            data: {
              courtId: template.courtId,
              type: template.activityType === 'MAINTENANCE' ? template.type : 'INSPECTION',
              activityType: template.activityType,
              activityCategory: template.activityType !== 'MAINTENANCE' ? template.activityCategory : undefined,
              description: template.description,
              scheduledAt: sUtc,
              isPublic: template.isPublic ?? true,
              notes: undefined,
              cost: (template.cost as any) ?? undefined,
              estimatedDuration: dur,
              status: conflicts.length > 0 ? ('CONFLICT' as any) : 'SCHEDULED',
              seriesId,
            },
          });
          created.push(rec);
        }
      }
    }
    return { seriesId, created: created.length };
  }
}
