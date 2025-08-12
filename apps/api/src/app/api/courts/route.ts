import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth';
import { db } from '@repo/db';
import { z } from 'zod';

// Esquema para filtros de búsqueda de canchas (adaptado al esquema actual)
const GetCourtsSchema = z.object({
  centerId: z.string().optional(),
  sport: z.string().optional(),
  isActive: z.string().transform(val => val === 'true').optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
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
      where.sportType = {
        contains: validatedParams.sport,
        mode: 'insensitive',
      } as any;
    }
    
    if (validatedParams.isActive !== undefined) {
      where.isActive = validatedParams.isActive;
    }
    
    // Campos hasLighting/isIndoor/surface no existen en el esquema actual
    
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
            phone: true,
            email: true,
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
    const formattedCourts = courts.map((court: any) => ({
      id: court.id,
      name: court.name,
      sportType: (court as any).sportType,
      capacity: (court as any).capacity ?? 0,
      pricePerHour: Number((court as any).basePricePerHour) || 0,
      isActive: court.isActive,
      amenities: [],
      images: [],
      center: court.center,
      stats: {
        activeReservations: (court as any)._count?.reservations || 0,
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
}