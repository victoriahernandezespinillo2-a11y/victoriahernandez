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
  request: NextRequest
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const pathname = request.nextUrl.pathname;
    const courtId = pathname.split('/').pop() as string;
    
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
            phone: true,
            email: true,
          },
        },
        reservations: {
          where: {
            startTime: {
              gte: new Date(),
            },
            status: {
              in: ['PAID', 'IN_PROGRESS', 'PENDING'],
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
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          },
          select: {
            id: true,
            status: true,
            scheduledAt: true,
            startedAt: true,
            completedAt: true,
            type: true,
            description: true,
          },
          orderBy: {
            scheduledAt: 'asc',
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
            isActive: true,
            priority: true,
          },
          orderBy: {
            priority: 'desc',
          },
        },
        _count: {
          select: {
            reservations: {
              where: {
                status: { in: ['PAID', 'IN_PROGRESS', 'COMPLETED'] },
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
        status: { in: ['PAID', 'IN_PROGRESS', 'COMPLETED'] },
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
      sportType: (court as any).sportType,
      capacity: (court as any).capacity ?? 0,
      hourlyRate: Number((court as any).basePricePerHour || 0),
      isActive: court.isActive,
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