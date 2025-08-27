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
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(20),
  search: z.string().optional(),
  centerId: z.string().optional(),
  sport: z.enum(['FOOTBALL', 'BASKETBALL', 'TENNIS', 'VOLLEYBALL', 'PADDLE', 'SQUASH']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
  sortBy: z.enum(['name', 'sport', 'createdAt', 'reservationsCount', 'revenue']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  includeStats: z.coerce.boolean().optional().default(true)
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
      
      // Construir filtros compatibles con el esquema actual
      const where: any = {};

      if (params.search) {
        where.name = { contains: params.search, mode: 'insensitive' };
      }

      if (params.centerId) {
        where.centerId = params.centerId;
      }

      if (params.sport) {
        where.sportType = params.sport;
      }

      if (params.status) {
        if (params.status === 'MAINTENANCE') {
          where.maintenanceStatus = { not: 'operational' };
        } else if (params.status === 'ACTIVE') {
          where.isActive = true;
        } else if (params.status === 'INACTIVE') {
          where.isActive = false;
        }
      }
      
      // Construir ordenamiento (adaptado al esquema)
      let orderBy: any = {};
      switch (params.sortBy) {
        case 'sport':
          orderBy = { sportType: params.sortOrder };
          break;
        case 'reservationsCount':
        case 'revenue':
          orderBy = { name: params.sortOrder };
          break;
        default:
          orderBy = { [params.sortBy!]: params.sortOrder };
      }
      
      // Obtener canchas y total (adaptado al esquema) y mapear a la forma esperada por el frontend
      const [courts, total] = await Promise.all([
        db.court.findMany({
          where,
          skip,
          take: params.limit,
          orderBy,
          select: {
            id: true,
            name: true,
            centerId: true,
            sportType: true,
            capacity: true,
            basePricePerHour: true,
            isActive: true,
            maintenanceStatus: true,
            createdAt: true,
            updatedAt: true,
            center: { select: { id: true, name: true } },
            _count: { select: { reservations: true } },
          }
        }),
        db.court.count({ where })
      ]);

      const mapped = courts.map((c: any) => {
        const hourlyRate = Number((c as any).basePricePerHour) || 0;
        const inMaintenance = c.maintenanceStatus && c.maintenanceStatus !== 'operational';
        const status = inMaintenance ? 'MAINTENANCE' : (c.isActive ? 'AVAILABLE' : 'INACTIVE');
        return {
          id: c.id,
          name: c.name,
          type: c.sportType || 'MULTIPURPOSE',
          centerId: c.centerId,
          centerName: c.center?.name || '',
          description: '',
          hourlyRate,
          capacity: c.capacity ?? 0,
          status,
          features: [],
          dimensions: '',
          surface: '',
          lighting: true,
          covered: false,
          createdAt: c.createdAt,
        };
      });

      const result = {
        data: mapped,
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
  })(request, {} as any);
}

/**
 * POST /api/admin/courts
 * Crear nueva cancha
 * Acceso: ADMIN únicamente
 */
export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
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
      
      // Mapear al esquema de Prisma
      const createData: any = {
        name: courtData.name,
        centerId: courtData.centerId,
        sportType: courtData.sport,
        capacity: courtData.capacity,
        basePricePerHour: courtData.pricePerHour,
        isActive: courtData.status ? courtData.status === 'ACTIVE' : true,
        maintenanceStatus: courtData.status === 'MAINTENANCE' ? 'maintenance' : 'operational',
      };

      const created = await db.court.create({
        data: createData,
        select: {
          id: true,
          name: true,
          centerId: true,
          sportType: true,
          capacity: true,
          basePricePerHour: true,
          isActive: true,
          maintenanceStatus: true,
          createdAt: true,
          center: { select: { id: true, name: true } },
        }
      });

      const mapped = {
        id: created.id,
        name: created.name,
        type: created.sportType || 'MULTIPURPOSE',
        centerId: created.centerId,
        centerName: created.center?.name || '',
        description: '',
        hourlyRate: Number((created as any).basePricePerHour) || 0,
        capacity: created.capacity ?? 0,
        status: created.maintenanceStatus && created.maintenanceStatus !== 'operational'
          ? 'MAINTENANCE'
          : (created.isActive ? 'AVAILABLE' : 'INACTIVE'),
        features: [],
        dimensions: '',
        surface: courtData.surface || '',
        lighting: courtData.lighting ?? true,
        covered: courtData.covered ?? false,
        createdAt: created.createdAt,
      };
      
      return ApiResponse.success(mapped);
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
  })(request, {} as any);
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
        status: { in: ['PAID', 'IN_PROGRESS', 'COMPLETED'] }
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
