/**
 * API Routes para administración de canchas específicas
 * GET /api/admin/courts/[id] - Obtener detalles de una cancha específica
 * PUT /api/admin/courts/[id] - Actualizar una cancha específica
 * DELETE /api/admin/courts/[id] - Eliminar una cancha específica
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const UpdateCourtSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  description: z.string().optional(),
  sport: z.enum(['FOOTBALL', 'BASKETBALL', 'TENNIS', 'VOLLEYBALL', 'PADDLE', 'SQUASH', 'BADMINTON', 'MULTIPURPOSE']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RESERVED']).optional(),
  capacity: z.number().int().min(2).max(50).optional(),
  hourlyRate: z.number().min(0).optional(),
  centerId: z.string().optional(),
  specifications: z.object({
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    surface: z.string().optional(),
    lighting: z.boolean().optional(),
    covered: z.boolean().optional(),
    airConditioning: z.boolean().optional()
  }).optional(),
  equipment: z.array(z.string()).optional(),
  rules: z.array(z.string()).optional(),
  images: z.array(z.string().url()).optional(),
  availability: z.object({
    monday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    tuesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    wednesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    thursday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    friday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    saturday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    sunday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional()
  }).optional(),
  pricing: z.object({
    peakHours: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
      rate: z.number().min(0).optional()
    }).optional(),
    offPeakRate: z.number().min(0).optional(),
    weekendRate: z.number().min(0).optional(),
    memberDiscount: z.number().min(0).max(100).optional()
  }).optional()
});

/**
 * GET /api/admin/courts/[id]
 * Obtener detalles completos de una cancha específica
 * Acceso: ADMIN únicamente
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminMiddleware(async (req, context) => {
    try {
      const courtId = params.id;
      
      const court = await db.court.findUnique({
        where: { id: courtId },
        include: {
          center: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true
            }
          },
          reservations: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              status: true,
              totalAmount: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            },
            orderBy: {
              startTime: 'desc'
            },
            take: 20
          },
          maintenances: {
            select: {
              id: true,
              type: true,
              status: true,
              description: true,
              scheduledDate: true,
              completedDate: true,
              estimatedDuration: true,
              actualDuration: true,
              cost: true,
              assignedTo: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            },
            orderBy: {
              scheduledDate: 'desc'
            },
            take: 10
          },
          _count: {
            select: {
              reservations: true
            }
          }
        }
      });
      
      if (!court) {
        return ApiResponse.notFound('Cancha no encontrada');
      }
      
      // Calcular estadísticas adicionales
      const [revenueStats, occupancyStats, upcomingReservations, activeMaintenances] = await Promise.all([
        // Estadísticas de ingresos (últimos 30 días)
        db.reservation.aggregate({
          where: {
            courtId: courtId,
            status: 'CONFIRMED',
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          },
          _sum: {
            totalAmount: true
          },
          _count: {
            id: true
          }
        }),
        
        // Estadísticas de ocupación (últimos 7 días)
        db.reservation.count({
          where: {
            courtId: courtId,
            status: 'CONFIRMED',
            startTime: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              lte: new Date()
            }
          }
        }),
        
        // Próximas reservas
        prisma.reservation.count({
          where: {
            courtId: courtId,
            status: 'CONFIRMED',
            startTime: {
              gte: new Date()
            }
          }
        }),
        
        // Mantenimientos activos
        db.maintenance.count({
          where: {
            courtId: courtId,
            status: {
              in: ['SCHEDULED', 'IN_PROGRESS']
            }
          }
        })
      ]);
      
      // Calcular tasa de ocupación
      const totalHoursInWeek = 7 * 12; // Asumiendo 12 horas operativas por día
      const occupancyRate = totalHoursInWeek > 0 ? 
        (occupancyStats / totalHoursInWeek) * 100 : 0;
      
      // Obtener horarios más populares
      const popularTimes = await db.reservation.groupBy({
        by: ['startTime'],
        where: {
          courtId: courtId,
          status: 'CONFIRMED',
          startTime: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 5
      });
      
      const courtDetails = {
        ...court,
        stats: {
          totalReservations: court._count.reservations,
          totalMaintenances: court._count.maintenances,
          revenue30Days: revenueStats._sum.totalAmount || 0,
          reservations30Days: revenueStats._count.id,
          occupancyRate: Math.round(occupancyRate * 100) / 100,
          upcomingReservations,
          activeMaintenances,
          averageReservationValue: revenueStats._count.id > 0 ? 
            (revenueStats._sum.totalAmount || 0) / revenueStats._count.id : 0
        },
        popularTimes: popularTimes.map(time => ({
          hour: new Date(time.startTime).getHours(),
          count: time._count.id
        }))
      };
      
      return ApiResponse.success(courtDetails);
    } catch (error) {
      console.error('Error obteniendo detalles de la cancha:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request, { params });
}

/**
 * PUT /api/admin/courts/[id]
 * Actualizar una cancha específica
 * Acceso: ADMIN únicamente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminMiddleware(async (req, context) => {
    try {
      const courtId = params.id;
      const body = await req.json();
      const courtData = UpdateCourtSchema.parse(body);
      
      // Verificar que la cancha existe
      const existingCourt = await db.court.findUnique({
        where: { id: courtId },
        include: {
          center: true
        }
      });
      
      if (!existingCourt) {
        return ApiResponse.notFound('Cancha no encontrada');
      }
      
      // Verificar que el centro existe si se está cambiando
      if (courtData.centerId && courtData.centerId !== existingCourt.centerId) {
        const centerExists = await db.center.findUnique({
          where: { id: courtData.centerId }
        });
        
        if (!centerExists) {
          return ApiResponse.badRequest('Centro no encontrado');
        }
      }
      
      // Verificar nombre único dentro del centro
      if (courtData.name && courtData.name !== existingCourt.name) {
        const nameExists = await db.court.findFirst({
          where: {
            name: courtData.name,
            centerId: courtData.centerId || existingCourt.centerId,
            id: {
              not: courtId
            }
          }
        });
        
        if (nameExists) {
          return ApiResponse.badRequest('Ya existe una cancha con ese nombre en el centro');
        }
      }
      
      // Actualizar cancha
      const updatedCourt = await db.court.update({
        where: { id: courtId },
        data: courtData,
        include: {
          center: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              reservations: true,
              maintenances: true
            }
          }
        }
      });
      
      // Log de auditoría removido temporalmente - modelo no existe en schema
      
      return ApiResponse.success(updatedCourt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error actualizando cancha:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request, { params });
}

/**
 * DELETE /api/admin/courts/[id]
 * Eliminar una cancha específica
 * Acceso: ADMIN únicamente
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminMiddleware(async (req, context) => {
    try {
      const courtId = params.id;
      
      // Verificar que la cancha existe
      const existingCourt = await db.court.findUnique({
        where: { id: courtId },
        include: {
          center: {
            select: {
              name: true
            }
          },
          reservations: {
            where: {
              status: 'CONFIRMED',
              startTime: {
                gte: new Date()
              }
            }
          },
          maintenances: {
            where: {
              status: {
                in: ['SCHEDULED', 'IN_PROGRESS']
              }
            }
          }
        }
      });
      
      if (!existingCourt) {
        return ApiResponse.notFound('Cancha no encontrada');
      }
      
      // Verificar si tiene reservas futuras
      if (existingCourt.reservations.length > 0) {
        return ApiResponse.badRequest(
          'No se puede eliminar la cancha porque tiene reservas futuras'
        );
      }
      
      // Verificar si tiene mantenimientos activos
      if (existingCourt.maintenances.length > 0) {
        return ApiResponse.badRequest(
          'No se puede eliminar la cancha porque tiene mantenimientos programados o en progreso'
        );
      }
      
      // Eliminar cancha
      await db.court.delete({
        where: { id: courtId }
      });
      
      // Registrar en log de auditoría
      await db.auditLog.create({
        data: {
          action: 'DELETE_COURT',
          entityType: 'COURT',
          entityId: courtId,
          userId: adminUser.id,
          details: {
            deletedCourt: {
              name: existingCourt.name,
              sport: existingCourt.sport,
              center: existingCourt.center.name,
              hourlyRate: existingCourt.hourlyRate
            }
          }
        }
      });
      
      return ApiResponse.success(
        { 
          id: courtId, 
          name: existingCourt.name,
          center: existingCourt.center.name
        }
      );
    } catch (error) {
      console.error('Error eliminando cancha:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request, { params });
}

/**
 * OPTIONS /api/admin/courts/[id]
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}