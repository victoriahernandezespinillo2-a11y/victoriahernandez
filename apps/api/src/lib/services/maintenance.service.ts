/**
 * Servicio de gestión de mantenimiento
 * Maneja programación, seguimiento y completado de tareas de mantenimiento
 */

import { db, MaintenanceSchedule } from '@repo/db';
import { z } from 'zod';
import { NotificationService } from '@polideportivo/notifications';

// Esquemas de validación
export const CreateMaintenanceSchema = z.object({
  courtId: z.string().uuid('ID de cancha inválido'),
  type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY'], {
    errorMap: () => ({ message: 'Tipo de mantenimiento inválido' }),
  }),
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  scheduledDate: z.string().datetime('Fecha programada inválida'),
  estimatedDuration: z.number().min(30, 'La duración mínima es 30 minutos').max(1440, 'La duración máxima es 24 horas'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  assignedTo: z.string().uuid('ID de técnico inválido').optional(),
  materials: z.array(z.object({
    name: z.string(),
    quantity: z.number().min(1),
    unit: z.string(),
    estimatedCost: z.number().min(0).optional(),
  })).optional(),
  notes: z.string().optional(),
});

export const UpdateMaintenanceSchema = z.object({
  type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY']).optional(),
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  scheduledDate: z.string().datetime().optional(),
  estimatedDuration: z.number().min(30).max(1440).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assignedTo: z.string().uuid().optional(),
  materials: z.array(z.object({
    name: z.string(),
    quantity: z.number().min(1),
    unit: z.string(),
    estimatedCost: z.number().min(0).optional(),
  })).optional(),
  notes: z.string().optional(),
});

export const CompleteMaintenanceSchema = z.object({
  actualDuration: z.number().min(1, 'La duración real debe ser mayor a 0'),
  actualCost: z.number().min(0, 'El costo real no puede ser negativo').optional(),
  completionNotes: z.string().min(10, 'Las notas de completado deben tener al menos 10 caracteres'),
  materialsUsed: z.array(z.object({
    name: z.string(),
    quantity: z.number().min(1),
    unit: z.string(),
    actualCost: z.number().min(0).optional(),
  })).optional(),
  nextMaintenanceDate: z.string().datetime().optional(),
  issues: z.array(z.object({
    description: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    resolved: z.boolean(),
  })).optional(),
});

export const GetMaintenanceSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  courtId: z.string().uuid().optional(),
  centerId: z.string().uuid().optional(),
  type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY']).optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assignedTo: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['scheduledDate', 'priority', 'createdAt', 'type']).default('scheduledDate'),
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
    const scheduledDate = new Date(validatedData.scheduledDate);
    const endDate = new Date(scheduledDate.getTime() + validatedData.estimatedDuration * 60000);

    const conflicts = await this.checkMaintenanceConflicts(
      validatedData.courtId,
      scheduledDate,
      endDate
    );

    if (conflicts.length > 0) {
      throw new Error('Existe conflicto con otro mantenimiento programado');
    }

    // Crear la tarea de mantenimiento
    const maintenance = await db.maintenanceSchedule.create({
      data: {
        courtId: validatedData.courtId,
        type: validatedData.type,
        title: validatedData.title,
        description: validatedData.description,
        scheduledDate,
        estimatedDuration: validatedData.estimatedDuration,
        priority: validatedData.priority,
        assignedTo: validatedData.assignedTo,
        materials: validatedData.materials || [],
        notes: validatedData.notes,
        status: 'SCHEDULED',
      },
      include: {
        court: {
          select: {
            id: true,
            name: true,
            sport: true,
            center: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Enviar notificación al técnico asignado
    if (maintenance.assignedUser) {
      try {
        await this.notificationService.sendEmail({
          to: maintenance.assignedUser.email,
          template: 'maintenance_assigned',
          data: {
            technicianName: maintenance.assignedUser.firstName,
            maintenanceTitle: maintenance.title,
            courtName: maintenance.court.name,
            centerName: maintenance.court.center.name,
            scheduledDate: scheduledDate.toLocaleDateString('es-ES'),
            scheduledTime: scheduledDate.toLocaleTimeString('es-ES'),
            priority: maintenance.priority,
          },
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
      priority,
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
      where.court = {
        centerId,
      };
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) where.scheduledDate.gte = new Date(startDate);
      if (endDate) where.scheduledDate.lte = new Date(endDate);
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
              sport: true,
              center: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          assignedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
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
            sport: true,
            center: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
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
    if (validatedData.scheduledDate || validatedData.estimatedDuration) {
      const newScheduledDate = validatedData.scheduledDate
        ? new Date(validatedData.scheduledDate)
        : maintenance.scheduledDate;
      const newDuration = validatedData.estimatedDuration || maintenance.estimatedDuration;
      const newEndDate = new Date(newScheduledDate.getTime() + newDuration * 60000);

      const conflicts = await this.checkMaintenanceConflicts(
        maintenance.courtId,
        newScheduledDate,
        newEndDate,
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
        title: validatedData.title,
        description: validatedData.description,
        scheduledDate: validatedData.scheduledDate ? new Date(validatedData.scheduledDate) : undefined,
        estimatedDuration: validatedData.estimatedDuration,
        priority: validatedData.priority,
        assignedTo: validatedData.assignedTo,
        materials: validatedData.materials,
        notes: validatedData.notes,
      },
      include: {
        court: {
          select: {
            id: true,
            name: true,
            sport: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
        assignedUser: true,
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
        actualStartDate: new Date(),
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
        assignedUser: true,
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
        completedDate: new Date(),
        actualDuration: validatedData.actualDuration,
        actualCost: validatedData.actualCost,
        completionNotes: validatedData.completionNotes,
        materialsUsed: validatedData.materialsUsed || [],
        issues: validatedData.issues || [],
      },
    });

    // Programar próximo mantenimiento si se especifica
    if (validatedData.nextMaintenanceDate) {
      await this.createMaintenance({
        courtId: maintenance.courtId,
        type: 'PREVENTIVE',
        title: `Mantenimiento preventivo - ${maintenance.court.name}`,
        description: `Mantenimiento preventivo programado automáticamente`,
        scheduledDate: validatedData.nextMaintenanceDate,
        estimatedDuration: maintenance.estimatedDuration,
        priority: 'MEDIUM',
        assignedTo: maintenance.assignedTo,
      });
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
    startDate: Date,
    endDate: Date,
    excludeId?: string
  ) {
    const where: any = {
      courtId,
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      OR: [
        {
          scheduledDate: {
            gte: startDate,
            lt: endDate,
          },
        },
        {
          AND: [
            { scheduledDate: { lte: startDate } },
            {
              scheduledDate: {
                gte: new Date(startDate.getTime() - 24 * 60 * 60 * 1000), // 24 horas antes
              },
            },
          ],
        },
      ],
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

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
          scheduledDate: { lt: now },
        },
      }),
      db.maintenanceSchedule.count({
        where: {
          ...where,
          status: 'COMPLETED',
          completedDate: { gte: startOfMonth },
        },
      }),
    ]);

    // Estadísticas por tipo
    const byType = await db.maintenanceSchedule.groupBy({
      by: ['type'],
      where,
      _count: { type: true },
    });

    // Estadísticas por prioridad
    const byPriority = await db.maintenanceSchedule.groupBy({
      by: ['priority'],
      where: { ...where, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
      _count: { priority: true },
    });

    return {
      total,
      scheduled,
      inProgress,
      completed,
      overdue,
      monthlyCompleted,
      byType: byType.map(item => ({
        type: item.type,
        count: item._count.type,
      })),
      byPriority: byPriority.map(item => ({
        priority: item.priority,
        count: item._count.priority,
      })),
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
        scheduledDate: {
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
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }
}