import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth';
import { db } from '@repo/db';
import { z } from 'zod';

// Esquema para filtros de búsqueda de canchas
const GetCourtsSchema = z.object({
  centerId: z.string().cuid().optional(),
  sport: z.string().optional(),
  surface: z.string().optional(),
  isActive: z.string().transform(val => val === 'true').optional(),
  hasLighting: z.string().transform(val => val === 'true').optional(),
  isIndoor: z.string().transform(val => val === 'true').optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
});

/**
 * GET /api/courts
 * Obtener lista de canchas con filtros
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    const validatedParams = GetCourtsSchema.parse(params);
    
    // Construir filtros para Prisma
    const where: any = {};
    
    if (validatedParams.centerId) {
      where.centerId = validatedParams.centerId;
    }
    
    if (validatedParams.sport) {
      where.sport = {
        contains: validatedParams.sport,
        mode: 'insensitive',
      };
    }
    
    if (validatedParams.surface) {
      where.surface = {
        contains: validatedParams.surface,
        mode: 'insensitive',
      };
    }
    
    if (validatedParams.isActive !== undefined) {
      where.isActive = validatedParams.isActive;
    }
    
    if (validatedParams.hasLighting !== undefined) {
      where.hasLighting = validatedParams.hasLighting;
    }
    
    if (validatedParams.isIndoor !== undefined) {
      where.isIndoor = validatedParams.isIndoor;
    }
    
    // Obtener total de registros para paginación
    const totalCourts = await db.court.count({ where });
    
    // Calcular paginación
    const page = validatedParams.page;
    const limit = validatedParams.limit;
    const skip = (page - 1) * limit;
    
    // Obtener canchas con información del centro
    const courts = await db.court.findMany({
      where,
      include: {
        center: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            phone: true,
            email: true,
            openingHours: true,
            amenities: true,
          },
        },
        _count: {
          select: {
            reservations: {
              where: {
                status: 'confirmed',
                startTime: {
                  gte: new Date(),
                },
              },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: [
        { isActive: 'desc' },
        { center: { name: 'asc' } },
        { name: 'asc' },
      ],
    });
    
    // Formatear respuesta
    const formattedCourts = courts.map(court => ({
      id: court.id,
      name: court.name,
      sport: court.sport,
      surface: court.surface,
      isIndoor: court.isIndoor,
      hasLighting: court.hasLighting,
      maxPlayers: court.maxPlayers,
      hourlyRate: court.hourlyRate,
      isActive: court.isActive,
      description: court.description,
      amenities: court.amenities,
      images: court.images,
      center: court.center,
      stats: {
        activeReservations: court._count.reservations,
      },
      createdAt: court.createdAt,
      updatedAt: court.updatedAt,
    }));
    
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
        sport: validatedParams.sport,
        surface: validatedParams.surface,
        isActive: validatedParams.isActive,
        hasLighting: validatedParams.hasLighting,
        isIndoor: validatedParams.isIndoor,
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
}