import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth';
import { db } from '@repo/db';
import { z } from 'zod';

// Esquema para filtros de búsqueda de centros
const GetCentersSchema = z.object({
  city: z.string().optional(),
  sport: z.string().optional(),
  amenity: z.string().optional(),
  isActive: z.string().transform(val => val === 'true').optional(),
  hasParking: z.string().transform(val => val === 'true').optional(),
  latitude: z.string().transform(Number).optional(),
  longitude: z.string().transform(Number).optional(),
  radius: z.string().transform(Number).optional().default('10'), // km
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
});

/**
 * GET /api/centers
 * Obtener lista de centros deportivos con filtros
 */
export async function GET(request: NextRequest) {
  try {
    // Seguridad robusta: aceptar sesión o JWT Bearer
    let userId: string | null = null;
    try {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwtLib = (await import('jsonwebtoken')) as unknown as typeof import('jsonwebtoken');
        const token = authHeader.substring(7);
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          console.error('❌ [CENTERS] JWT_SECRET no está configurado');
          return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
        }
        const payload = jwtLib.verify(token, jwtSecret) as any;
        userId = payload?.id || payload?.userId || payload?.uid || null;
      }
    } catch (error) {
      console.error('❌ [CENTERS] Error verificando JWT:', error);
    }
    if (!userId) {
      const session = await auth().catch(() => null);
      userId = session?.user?.id || null;
    }
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    const validatedParams = GetCentersSchema.parse(params);
    
    // Construir filtros para Prisma
    const where: any = {};
    
    if (validatedParams.city) {
      where.city = {
        contains: validatedParams.city,
        mode: 'insensitive',
      };
    }
    
    // isActive a nivel Center puede no existir en el esquema actual; omitimos este filtro
    
    // Filtro por deporte (buscar en las canchas del centro)
    if (validatedParams.sport) {
      where.courts = {
        some: {
          sportType: {
            contains: validatedParams.sport,
            mode: 'insensitive',
          },
          isActive: true,
        },
      };
    }
    
    // Filtro por amenidad
    if (validatedParams.amenity) {
      where.amenities = {
        array_contains: [validatedParams.amenity],
      };
    }
    
    // Filtro por estacionamiento
    if (validatedParams.hasParking !== undefined) {
      if (validatedParams.hasParking) {
        where.amenities = {
          array_contains: ['parking'],
        };
      }
    }
    
    // TODO: Implementar filtro por distancia geográfica
    // Requiere función de distancia en PostgreSQL o cálculo en aplicación
    
    // Obtener total de registros para paginación
    const totalCenters = await db.center.count({ where });
    
    // Calcular paginación
    const page = validatedParams.page;
    const limit = validatedParams.limit;
    const skip = (page - 1) * limit;
    
    // Obtener centros con información de canchas (solo select; no mezclar include+select)
    const centers = await db.center.findMany({
      where,
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        settings: true,
        timezone: true,
        dayStart: true,
        nightStart: true,
        createdAt: true,
        updatedAt: true,
        courts: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            sportType: true,
            basePricePerHour: true,
            _count: {
              select: {
                reservations: {
                  where: {
                    status: { in: ['PAID', 'IN_PROGRESS', 'COMPLETED'] },
                    startTime: { gte: new Date() },
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            courts: { where: { isActive: true } },
          },
        },
      },
      skip,
      take: limit,
      orderBy: [{ name: 'asc' }],
    });
    
    // Formatear respuesta con estadísticas
    const formattedCenters = centers.map((center: any) => {
      const s: any = center.settings || {};
      const dayStart = (center as any).dayStart || s.dayStart || '';
      const nightStart = (center as any).nightStart || s.nightStart || '';
      let businessOpen = '';
      let businessClose = '';
      try {
        const oh = s.operatingHours || {};
        const map: Record<number, string> = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
        const key = map[new Date().getDay()];
        const cfg = key ? oh[key] : undefined;
        if (cfg && cfg.closed !== true && cfg.open && cfg.close) {
          businessOpen = cfg.open;
          businessClose = cfg.close;
        }
      } catch {}
      const totalReservations = center.courts.reduce(
        (sum: number, court: any) => sum + court._count.reservations,
        0
      );
      
      const sportsOffered = [...new Set(center.courts.map((court: any) => (court as any).sportType))];
      
      const priceRange = center.courts.length > 0 ? {
        min: Math.min(...center.courts.map((court: any) => Number((court as any).basePricePerHour || 0))),
        max: Math.max(...center.courts.map((court: any) => Number((court as any).basePricePerHour || 0))),
      } : null;
      
      return {
        id: center.id,
        name: center.name,
        address: center.address,
        phone: center.phone,
        email: center.email,
        // Campos adicionales para UI
        dayStart: dayStart || '-',
        nightStart: nightStart || '-',
        businessOpen: businessOpen || '-',
        businessClose: businessClose || '-',
        stats: {
          totalCourts: center._count.courts,
          activeReservations: totalReservations,
          sportsOffered,
          priceRange,
        },
        courts: center.courts.map((court: any) => ({
          id: court.id,
          name: court.name,
          sportType: (court as any).sportType,
          hourlyRate: Number((court as any).basePricePerHour || 0),
          activeReservations: court._count.reservations,
        })),
        createdAt: center.createdAt,
        updatedAt: center.updatedAt,
      };
    });
    
    return NextResponse.json({
      data: formattedCenters,
      pagination: {
        page,
        limit,
        total: totalCenters,
        totalPages: Math.ceil(totalCenters / limit),
        hasNext: page * limit < totalCenters,
        hasPrev: page > 1,
      },
      filters: {
        city: validatedParams.city,
        sport: validatedParams.sport,
        amenity: validatedParams.amenity,
        isActive: validatedParams.isActive,
        hasParking: validatedParams.hasParking,
        location: validatedParams.latitude && validatedParams.longitude ? {
          latitude: validatedParams.latitude,
          longitude: validatedParams.longitude,
          radius: validatedParams.radius,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error obteniendo centros:', error);
    
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
