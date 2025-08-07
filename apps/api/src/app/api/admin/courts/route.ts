/**
 * API Routes para gestión de canchas desde administración
 * GET /api/admin/courts - Obtener lista de canchas con estadísticas
 * POST /api/admin/courts - Crear nueva cancha
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const GetCourtsQuerySchema = z.object({
  page: z.string().transform(Number).optional().default(1),
  limit: z.string().transform(Number).optional().default(20),
  search: z.string().optional(),
  centerId: z.string().optional(),
  sport: z.enum(['FOOTBALL', 'BASKETBALL', 'TENNIS', 'VOLLEYBALL', 'PADDLE', 'SQUASH']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
  sortBy: z.enum(['name', 'sport', 'createdAt', 'reservationsCount', 'revenue']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  includeStats: z.string().transform(Boolean).optional().default(true)
});

const CreateCourtSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  sport: z.enum(['FOOTBALL', 'BASKETBALL', 'TENNIS', 'VOLLEYBALL', 'PADDLE', 'SQUASH']),
  centerId: z.string().min(1, 'Centro requerido'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).default('ACTIVE'),
  capacity: z.number().int().min(1, 'La capacidad debe ser al menos 1'),
  pricePerHour: z.number().min(0, 'El precio debe ser positivo'),
  features: z.array(z.string()).optional().default([]),
  dimensions: z.object({
    length: z.number().positive('La longitud debe ser positiva'),
    width: z.number().positive('El ancho debe ser positivo'),
    height: z.number().positive('La altura debe ser positiva').optional()
  }).optional(),
  surface: z.string().optional(),
  lighting: z.boolean().optional().default(true),
  covered: z.boolean().optional().default(false),
  equipment: z.array(z.string()).optional().default([])
});

/**
 * GET /api/admin/courts
 * Obtener lista de canchas con estadísticas detalladas
 * Acceso: ADMIN únicamente
 */
export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const params = GetCourtsQuerySchema.parse(Object.fromEntries(searchParams.entries()));
      
      const skip = (params.page - 1) * params.limit;
      
      // Construir filtros
      const where: any = {};
      
      if (params.search) {
        where.OR = [
          { name: { contains: params.search, mode: 'insensitive' } },
          { description: { contains: params.search, mode: 'insensitive' } },
          { surface: { contains: params.search, mode: 'insensitive' } }
        ];
      }
      
      if (params.centerId) {
        where.centerId = params.centerId;
      }
      
      if (params.sport) {
        where.sport = params.sport;
      }
      
      if (params.status) {
        where.status = params.status;
      }
      
      // Construir ordenamiento
      let orderBy: any = {};
      
      switch (params.sortBy) {
        case 'reservationsCount':
          orderBy = { reservations: { _count: params.sortOrder } };
          break;
        case 'revenue':
          // Para ordenar por ingresos necesitamos una consulta más compleja
          orderBy = { name: params.sortOrder }; // Fallback
          break;
        default:
          orderBy[params.sortBy] = params.sortOrder;
      }
      
      // Obtener canchas y total
      const [courts, total] = await Promise.all([
        db.court.findMany({
          where,
          skip,
          take: params.limit,
          orderBy,
          select: {
            id: true,
            name: true,
            description: true,
            sport: true,
            status: true,
            capacity: true,
            pricePerHour: true,
            features: true,
            dimensions: true,
            surface: true,
            lighting: true,
            covered: true,
            equipment: true,
            createdAt: true,
            updatedAt: true,
            center: {
              select: {
                id: true,
                name: true,
                address: true
              }
            },
            _count: {
              select: {
                reservations: true,
                maintenances: true
              }
            }
          }
        }),
        db.court.count({ where })
      ]);
      
      // Obtener estadísticas adicionales si se solicitan
      let courtsWithStats = courts;
      
      if (params.includeStats) {
        courtsWithStats = await Promise.all(
          courts.map(async (court) => {
            const [revenue, occupancyRate, activeMaintenances, upcomingReservations] = await Promise.all([
              // Ingresos totales
              db.payment.aggregate({
                where: {
                  reservation: {
                    courtId: court.id
                  },
                  status: 'COMPLETED'
                },
                _sum: {
                  amount: true
                }
              }),
              
              // Tasa de ocupación (últimos 30 días)
              getCourtOccupancyRate(court.id),
              
              // Mantenimientos activos
              db.maintenance.count({
                where: {
                  courtId: court.id,
                  status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
                }
              }),
              
              // Reservas próximas (próximos 7 días)
              db.reservation.count({
                where: {
                  courtId: court.id,
                  startTime: {
                    gte: new Date(),
                    lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  },
                  status: { in: ['CONFIRMED', 'PENDING'] }
                }
              })
            ]);
            
            return {
              ...court,
              stats: {
                totalRevenue: revenue._sum.amount || 0,
                occupancyRate,
                activeMaintenances,
                upcomingReservations,
                totalReservations: court._count.reservations,
                totalMaintenances: court._count.maintenances
              }
            };
          })
        );
      }
      
      const result = {
        data: courtsWithStats,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          pages: Math.ceil(total / params.limit)
        },
        filters: {
          search: params.search,
          centerId: params.centerId,
          sport: params.sport,
          status: params.status
        },
        sorting: {
          sortBy: params.sortBy,
          sortOrder: params.sortOrder
        }
      };
      
      return ApiResponse.success(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error obteniendo canchas:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * POST /api/admin/courts
 * Crear nueva cancha
 * Acceso: ADMIN únicamente
 */
export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req, { user }) => {
    try {
      const body = await req.json();
      const courtData = CreateCourtSchema.parse(body);
      
      // Verificar que el centro existe
      const center = await db.center.findUnique({
        where: { id: courtData.centerId }
      });
      
      if (!center) {
        return ApiResponse.notFound('Centro no encontrado');
      }
      
      // Verificar que no existe una cancha con el mismo nombre en el centro
      const existingCourt = await db.court.findFirst({
        where: {
          name: {
            equals: courtData.name,
            mode: 'insensitive'
          },
          centerId: courtData.centerId
        }
      });
      
      if (existingCourt) {
        return ApiResponse.conflict('Ya existe una cancha con ese nombre en este centro');
      }
      
      // Crear cancha
      const newCourt = await db.court.create({
        data: {
          ...courtData,
          createdBy: user.id
        },
        select: {
          id: true,
          name: true,
          description: true,
          sport: true,
          status: true,
          capacity: true,
          pricePerHour: true,
          features: true,
          dimensions: true,
          surface: true,
          lighting: true,
          covered: true,
          equipment: true,
          createdAt: true,
          center: {
            select: {
              id: true,
              name: true,
              address: true
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
      
      return ApiResponse.success(newCourt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error creando cancha:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

// Función auxiliar para calcular tasa de ocupación de una cancha
async function getCourtOccupancyRate(courtId: string): Promise<number> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Calcular slots totales disponibles (asumiendo 12 horas de operación por día)
    const totalDays = 30;
    const hoursPerDay = 12;
    const totalSlots = totalDays * hoursPerDay;
    
    // Obtener reservas confirmadas en los últimos 30 días
    const reservedSlots = await db.reservation.count({
      where: {
        courtId,
        createdAt: {
          gte: thirtyDaysAgo
        },
        status: { in: ['CONFIRMED', 'COMPLETED'] }
      }
    });
    
    return totalSlots > 0 ? (reservedSlots / totalSlots) * 100 : 0;
  } catch (error) {
    console.error('Error calculando tasa de ocupación:', error);
    return 0;
  }
}

/**
 * OPTIONS /api/admin/courts
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}