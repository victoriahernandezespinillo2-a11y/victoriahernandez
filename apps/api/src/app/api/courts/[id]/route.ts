import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth';
import { db } from '@repo/db';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/courts/[id]
 * Obtener detalles de una cancha específica
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const courtId = params.id;
    
    if (!courtId) {
      return NextResponse.json(
        { error: 'ID de cancha requerido' },
        { status: 400 }
      );
    }

    // Obtener información completa de la cancha
    const court = await db.court.findUnique({
      where: { id: courtId },
      include: {
        center: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            postalCode: true,
            phone: true,
            email: true,
            website: true,
            openingHours: true,
            amenities: true,
            description: true,
            images: true,
            coordinates: true,
          },
        },
        reservations: {
          where: {
            startTime: {
              gte: new Date(),
            },
            status: {
              in: ['confirmed', 'pending'],
            },
          },
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            startTime: 'asc',
          },
          take: 10, // Próximas 10 reservas
        },
        maintenanceSchedules: {
          where: {
            startTime: {
              gte: new Date(),
            },
          },
          select: {
            id: true,
            startTime: true,
            endTime: true,
            type: true,
            description: true,
            isRecurring: true,
          },
          orderBy: {
            startTime: 'asc',
          },
          take: 5, // Próximos 5 mantenimientos
        },
        pricingRules: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            basePrice: true,
            timeSlots: true,
            daysOfWeek: true,
            validFrom: true,
            validTo: true,
            membershipDiscount: true,
            description: true,
          },
          orderBy: {
            priority: 'desc',
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
            waitingLists: {
              where: {
                status: 'active',
              },
            },
          },
        },
      },
    });
    
    if (!court) {
      return NextResponse.json(
        { error: 'Cancha no encontrada' },
        { status: 404 }
      );
    }
    
    // Calcular estadísticas adicionales
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Reservas de esta semana
    const weeklyReservations = await db.reservation.count({
      where: {
        courtId,
        status: 'confirmed',
        startTime: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
    });
    
    // Calcular ocupación promedio
    const totalHoursInWeek = 7 * 17; // 7 días * 17 horas (6:00 - 23:00)
    const occupancyRate = (weeklyReservations / totalHoursInWeek) * 100;
    
    // Formatear respuesta
    const formattedCourt = {
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
      specifications: court.specifications,
      center: court.center,
      upcomingReservations: court.reservations,
      maintenanceSchedules: court.maintenanceSchedules,
      pricingRules: court.pricingRules,
      stats: {
        activeReservations: court._count.reservations,
        waitingListEntries: court._count.waitingLists,
        weeklyReservations,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
      },
      availability: {
        isCurrentlyAvailable: !court.reservations.some(reservation => {
          const start = new Date(reservation.startTime);
          const end = new Date(reservation.endTime);
          return now >= start && now <= end;
        }),
        nextAvailableSlot: court.reservations.length > 0 
          ? court.reservations[0].endTime 
          : null,
      },
      createdAt: court.createdAt,
      updatedAt: court.updatedAt,
    };
    
    return NextResponse.json({ court: formattedCourt });
  } catch (error) {
    console.error('Error obteniendo cancha:', error);
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}