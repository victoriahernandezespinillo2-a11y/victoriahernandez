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
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'courtsCount', 'reservationsCount']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  includeStats: z.coerce.boolean().optional().default(false)
});

const CreateCenterSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  address: z.string().min(3, 'La dirección debe tener al menos 3 caracteres').optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  description: z.string().optional(),
  website: z.string().url('URL inválida').optional(),
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

      // Filtros compatibles con el esquema actual
      const where: any = {};
      if (params.search) {
        where.OR = [
          { name: { contains: params.search, mode: 'insensitive' } },
          { address: { contains: params.search, mode: 'insensitive' } },
        ];
      }

      // Ordenamiento simple
      let orderBy: any = {};
      switch (params.sortBy) {
        case 'courtsCount':
        case 'reservationsCount':
          orderBy = { name: params.sortOrder };
          break;
        default:
          orderBy = { [params.sortBy!]: params.sortOrder };
      }

      const [centers, total] = await Promise.all([
        db.center.findMany({
          where,
          skip,
          take: params.limit,
          orderBy,
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { courts: true } },
          }
        }),
        db.center.count({ where })
      ]);

      const mapped = centers.map((c: any) => ({
        id: c.id,
        name: c.name,
        address: c.address || '',
        phone: c.phone || '',
        email: c.email || '',
        status: 'ACTIVE' as const,
        courtsCount: c._count.courts,
        capacity: 0,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

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
  })(request, {} as any);
}

/**
 * POST /api/admin/centers
 * Crear nuevo centro
 * Acceso: ADMIN únicamente
 */
export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
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
      
      // Mapear datos al esquema real (guardar extras en settings)
      const settings: any = {};
      if (centerData.description) settings.description = centerData.description;
      if (centerData.website) settings.website = centerData.website;

      const newCenter = await db.center.create({
        data: {
          name: centerData.name,
          address: centerData.address,
          phone: centerData.phone,
          email: centerData.email,
          settings,
        },
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          email: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { courts: true } },
        }
      });
      
      const mapped = {
        id: newCenter.id,
        name: newCenter.name,
        address: newCenter.address || '',
        phone: newCenter.phone || '',
        email: newCenter.email || '',
        status: 'ACTIVE' as const,
        courtsCount: newCenter._count.courts,
        capacity: 0,
        createdAt: newCenter.createdAt,
        updatedAt: newCenter.updatedAt,
      };

      return ApiResponse.success(mapped, 201);
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
  })(request, {} as any);
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
        status: { in: ['PAID', 'IN_PROGRESS', 'COMPLETED'] }
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