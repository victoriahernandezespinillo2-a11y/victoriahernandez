/**
 * API Routes para gestión de centros desde administración
 * GET /api/admin/centers - Obtener lista de centros con estadísticas
 * POST /api/admin/centers - Crear nuevo centro
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const GetCentersQuerySchema = z.object({
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
  sortBy: z.enum(['name', 'createdAt', 'courtsCount', 'reservationsCount']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  includeStats: z.string().transform(Boolean).optional().default('true')
});

const CreateCenterSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  website: z.string().url('URL inválida').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).default('ACTIVE'),
  operatingHours: z.object({
    monday: z.object({ open: z.string(), close: z.string() }).optional(),
    tuesday: z.object({ open: z.string(), close: z.string() }).optional(),
    wednesday: z.object({ open: z.string(), close: z.string() }).optional(),
    thursday: z.object({ open: z.string(), close: z.string() }).optional(),
    friday: z.object({ open: z.string(), close: z.string() }).optional(),
    saturday: z.object({ open: z.string(), close: z.string() }).optional(),
    sunday: z.object({ open: z.string(), close: z.string() }).optional()
  }).optional(),
  amenities: z.array(z.string()).optional().default([]),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number()
  }).optional()
});

/**
 * GET /api/admin/centers
 * Obtener lista de centros con estadísticas detalladas
 * Acceso: ADMIN únicamente
 */
export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const params = GetCentersQuerySchema.parse(Object.fromEntries(searchParams.entries()));
      
      const skip = (params.page - 1) * params.limit;
      
      // Construir filtros
      const where: any = {};
      
      if (params.search) {
        where.OR = [
          { name: { contains: params.search, mode: 'insensitive' } },
          { description: { contains: params.search, mode: 'insensitive' } },
          { address: { contains: params.search, mode: 'insensitive' } }
        ];
      }
      
      if (params.status) {
        where.status = params.status;
      }
      
      // Construir ordenamiento
      let orderBy: any = {};
      
      switch (params.sortBy) {
        case 'courtsCount':
          orderBy = { courts: { _count: params.sortOrder } };
          break;
        case 'reservationsCount':
          // Para ordenar por reservas necesitamos una consulta más compleja
          orderBy = { name: params.sortOrder }; // Fallback
          break;
        default:
          orderBy[params.sortBy] = params.sortOrder;
      }
      
      // Obtener centros y total
      const [centers, total] = await Promise.all([
        db.center.findMany({
          where,
          skip,
          take: params.limit,
          orderBy,
          select: {
            id: true,
            name: true,
            description: true,
            address: true,
            phone: true,
            email: true,
            website: true,
            status: true,
            operatingHours: true,
            amenities: true,
            coordinates: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                courts: true,
                users: true
              }
            }
          }
        }),
        db.center.count({ where })
      ]);
      
      // Obtener estadísticas adicionales si se solicitan
      let centersWithStats = centers;
      
      if (params.includeStats) {
        centersWithStats = await Promise.all(
          centers.map(async (center) => {
            const [reservationsCount, totalRevenue, activeMaintenances, averageOccupancy] = await Promise.all([
              // Total de reservas
              db.reservation.count({
                where: {
                  court: {
                    centerId: center.id
                  }
                }
              }),
              
              // Ingresos totales
              db.payment.aggregate({
                where: {
                  centerId: center.id,
                  status: 'COMPLETED'
                },
                _sum: {
                  amount: true
                }
              }),
              
              // Mantenimientos activos
              db.maintenance.count({
                where: {
                  court: {
                    centerId: center.id
                  },
                  status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
                }
              }),
              
              // Ocupación promedio (últimos 30 días)
              getAverageOccupancy(center.id)
            ]);
            
            return {
              ...center,
              stats: {
                totalReservations: reservationsCount,
                totalRevenue: totalRevenue._sum.amount || 0,
                activeMaintenances,
                averageOccupancy,
                totalCourts: center._count.courts,
                totalUsers: center._count.users
              }
            };
          })
        );
      }
      
      const result = {
        data: centersWithStats,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          pages: Math.ceil(total / params.limit)
        },
        filters: {
          search: params.search,
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
      
      console.error('Error obteniendo centros:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * POST /api/admin/centers
 * Crear nuevo centro
 * Acceso: ADMIN únicamente
 */
export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req, { params }) => {
    try {
      const body = await req.json();
      const centerData = CreateCenterSchema.parse(body);
      
      // Verificar que no existe un centro con el mismo nombre
      const existingCenter = await db.center.findFirst({
        where: {
          name: {
            equals: centerData.name,
            mode: 'insensitive'
          }
        }
      });
      
      if (existingCenter) {
        return ApiResponse.error('Ya existe un centro con ese nombre', 409);
      }
      
      // Crear centro
      const newCenter = await db.center.create({
        data: {
          ...centerData,
          createdBy: user.id
        },
        select: {
          id: true,
          name: true,
          description: true,
          address: true,
          phone: true,
          email: true,
          website: true,
          status: true,
          operatingHours: true,
          amenities: true,
          coordinates: true,
          createdAt: true,
          _count: {
            select: {
              courts: true,
              users: true
            }
          }
        }
      });
      
      return ApiResponse.success(newCenter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error creando centro:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

// Función auxiliar para calcular ocupación promedio
async function getAverageOccupancy(centerId: string): Promise<number> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Obtener todas las canchas del centro
    const courts = await db.court.findMany({
      where: { centerId },
      select: { id: true }
    });
    
    if (courts.length === 0) return 0;
    
    // Calcular slots totales disponibles (asumiendo 12 horas de operación por día)
    const totalDays = 30;
    const hoursPerDay = 12;
    const totalSlots = courts.length * totalDays * hoursPerDay;
    
    // Obtener reservas confirmadas en los últimos 30 días
    const reservedSlots = await db.reservation.count({
      where: {
        court: {
          centerId
        },
        createdAt: {
          gte: thirtyDaysAgo
        },
        status: { in: ['CONFIRMED', 'COMPLETED'] }
      }
    });
    
    return totalSlots > 0 ? (reservedSlots / totalSlots) * 100 : 0;
  } catch (error) {
    console.error('Error calculando ocupación promedio:', error);
    return 0;
  }
}

/**
 * OPTIONS /api/admin/centers
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}