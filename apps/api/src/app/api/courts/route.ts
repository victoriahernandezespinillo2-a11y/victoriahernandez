import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/db';
import { z } from 'zod';
import { withAuthMiddleware } from '@/lib/middleware';

// Esquema para filtros de búsqueda de canchas (adaptado al esquema actual)
const GetCourtsSchema = z.object({
  centerId: z.string().optional(),
  sport: z.string().optional(),
  // Aceptar también sportType para compatibilidad con el frontend
  sportType: z.string().optional(),
  isActive: z.string().transform(val => val === 'true').optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * GET /api/courts
 * Obtener lista de canchas con filtros
 */
export async function GET(request: NextRequest) {
  return withAuthMiddleware(async (req: NextRequest) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser?.id) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        );
      }

      const { searchParams } = new URL(req.url);
      const params = Object.fromEntries(searchParams.entries());
      const validatedParams = GetCourtsSchema.parse(params);

      // Construir filtros para Prisma
      const where: any = {};

      if (validatedParams.centerId) {
        where.centerId = validatedParams.centerId;
      }

      // Permitir filtrar por sport (alias) o sportType (param original del frontend)
      const sportQuery = validatedParams.sport || validatedParams.sportType;
      if (sportQuery) {
        where.sportType = {
          contains: sportQuery,
          mode: 'insensitive',
        } as any;
      }

      if (validatedParams.isActive !== undefined) {
        where.isActive = validatedParams.isActive;
      }

      // Obtener total de registros para paginación
      const totalCourts = await db.court.count({ where });

      // Calcular paginación
      const page = validatedParams.page;
      const limit = validatedParams.limit;
      const skip = (page - 1) * limit;

      // Obtener canchas con información del centro y precios por deporte
      const courts = await db.court.findMany({
        where,
        include: {
          center: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
              email: true,
            },
          },
          // Incluir precios por deporte para canchas multiuso
          sportPricing: {
            select: {
              sport: true,
              pricePerHour: true,
            },
          },
          _count: {
            select: {
              reservations: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: [
          { isActive: 'desc' },
          { name: 'asc' },
        ],
      });

      // Formatear respuesta
      const formattedCourts = courts.map((court: any) => {
        // Convertir sportPricing array a objeto para fácil acceso
        const sportPricingMap: Record<string, number> = {};
        if (Array.isArray(court.sportPricing)) {
          court.sportPricing.forEach((sp: any) => {
            sportPricingMap[sp.sport] = Number(sp.pricePerHour);
          });
        }

        return {
          id: court.id,
          name: court.name,
          centerId: (court as any).centerId,
          sportType: (court as any).sportType,
          capacity: (court as any).capacity ?? 0,
          pricePerHour: Number((court as any).basePricePerHour) || 0,
          // Iluminación: exponer flags y precio extra por hora si existen en el modelo
          hasLighting: Boolean((court as any).hasLighting),
          lightingExtraPerHour: Number((court as any).lightingExtraPerHour ?? 0),
          isActive: court.isActive,
          // Campos necesarios para filtrado correcto
          isMultiuse: Boolean((court as any).isMultiuse ?? false),
          allowedSports: Array.isArray((court as any).allowedSports) 
            ? (court as any).allowedSports 
            : [],
          // Precios por deporte para canchas multiuso
          sportPricing: sportPricingMap,
          amenities: [],
          images: [],
          center: court.center,
          stats: {
            activeReservations: (court as any)._count?.reservations || 0,
          },
          createdAt: court.createdAt,
          updatedAt: court.updatedAt,
        };
      });

      return NextResponse.json({
        courts: formattedCourts,
        pagination: {
          page,
          limit,
          total: totalCourts,
          totalPages: Math.ceil(totalCourts / limit),
          hasNext: page * limit < totalCourts,
          hasPrev: page > 1,
        },
        filters: {
          centerId: validatedParams.centerId,
          sport: validatedParams.sport || validatedParams.sportType,
          isActive: validatedParams.isActive,
        },
      });
    } catch (error) {
      console.error('Error obteniendo canchas:', error);

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Parámetros inválidos', details: error.errors },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  })(request);
}
