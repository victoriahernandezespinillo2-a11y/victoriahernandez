/**
 * Servicio de gestión de mantenimiento
 * Maneja programación, seguimiento y completado de tareas de mantenimiento
 */

import { db } from '@repo/db';
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
  limit: z.coerce.number().min(1).max(100).default(20),
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
  async createMaintenance(data: z.infer<typeof CreateMaintenanceSchema>) {
    const validatedData = CreateMaintenanceSchema.parse(data);

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

    // Verificar conflictos de horario
    const scheduledAt = new Date(validatedData.scheduledAt);
    const conflicts = await this.checkMaintenanceConflicts(
      validatedData.courtId,
      scheduledAt
    );

    if (conflicts.length > 0) {
      throw new Error('Existe conflicto con otro mantenimiento programado');
    }

    // Crear la tarea de mantenimiento
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
              },
            },
          },
        },
      },
    });

    // Enviar notificación al técnico asignado
    if ((maintenance as any).assignedTo) {
      try {
        await this.notificationService.sendEmail({
          to: 'staff@polideportivo.com',
          subject: 'Nuevo mantenimiento asignado',
          html: `<p>Se ha programado un mantenimiento en ${((maintenance as any).court?.name) ?? 'la instalación'} para el ${scheduledAt.toLocaleString('es-ES')}.</p>`
        });
      } catch (error) {
        console.error('Error enviando notificación de asignación:', error);
      }
    }

    return maintenance;
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
    const [maintenances, total] = await Promise.all([
      db.maintenanceSchedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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
                },
              },
            },
          },
        },
      }),
      db.maintenanceSchedule.count({ where }),
    ]);

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
}
