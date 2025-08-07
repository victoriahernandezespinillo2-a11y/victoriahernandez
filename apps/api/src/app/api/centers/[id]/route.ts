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
 * GET /api/centers/[id]
 * Obtener detalles completos de un centro deportivo específico
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

    const centerId = params.id;
    
    if (!centerId) {
      return NextResponse.json(
        { error: 'ID de centro requerido' },
        { status: 400 }
      );
    }

    // Obtener información completa del centro
    const center = await db.center.findUnique({
      where: { id: centerId },
      include: {
        courts: {
          include: {
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
              },
              orderBy: {
                startTime: 'asc',
              },
              take: 5, // Próximas 5 reservas por cancha
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
              },
              orderBy: {
                startTime: 'asc',
              },
              take: 3, // Próximos 3 mantenimientos por cancha
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
                membershipDiscount: true,
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
          orderBy: [
            { isActive: 'desc' },
            { name: 'asc' },
          ],
        },
        _count: {
          select: {
            courts: true,
          },
        },
      },
    });
    
    if (!center) {
      return NextResponse.json(
        { error: 'Centro no encontrado' },
        { status: 404 }
      );
    }
    
    // Calcular estadísticas del centro
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Reservas de esta semana para todo el centro
    const weeklyReservations = await db.reservation.count({
      where: {
        court: {
          centerId,
        },
        status: 'confirmed',
        startTime: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
    });
    
    // Reservas del mes actual
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const monthlyReservations = await db.reservation.count({
      where: {
        court: {
          centerId,
        },
        status: 'confirmed',
        startTime: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });
    
    // Calcular estadísticas por deporte
    const sportStats = center.courts.reduce((stats, court) => {
      if (!stats[court.sport]) {
        stats[court.sport] = {
          totalCourts: 0,
          activeCourts: 0,
          activeReservations: 0,
          waitingListEntries: 0,
          priceRange: { min: Infinity, max: -Infinity },
        };
      }
      
      stats[court.sport].totalCourts++;
      if (court.isActive) {
        stats[court.sport].activeCourts++;
      }
      stats[court.sport].activeReservations += court._count.reservations;
      stats[court.sport].waitingListEntries += court._count.waitingLists;
      
      if (court.hourlyRate < stats[court.sport].priceRange.min) {
        stats[court.sport].priceRange.min = court.hourlyRate;
      }
      if (court.hourlyRate > stats[court.sport].priceRange.max) {
        stats[court.sport].priceRange.max = court.hourlyRate;
      }
      
      return stats;
    }, {} as any);
    
    // Limpiar valores infinitos en priceRange
    Object.keys(sportStats).forEach(sport => {
      if (sportStats[sport].priceRange.min === Infinity) {
        sportStats[sport].priceRange.min = 0;
      }
      if (sportStats[sport].priceRange.max === -Infinity) {
        sportStats[sport].priceRange.max = 0;
      }
    });
    
    // Formatear respuesta
    const formattedCenter = {
      id: center.id,
      name: center.name,
      address: center.address,
      city: center.city,
      postalCode: center.postalCode,
      phone: center.phone,
      email: center.email,
      website: center.website,
      description: center.description,
      amenities: center.amenities,
      images: center.images,
      openingHours: center.openingHours,
      coordinates: center.coordinates,
      isActive: center.isActive,
      stats: {
        totalCourts: center._count.courts,
        activeCourts: center.courts.filter(court => court.isActive).length,
        totalActiveReservations: center.courts.reduce(
          (sum, court) => sum + court._count.reservations,
          0
        ),
        totalWaitingListEntries: center.courts.reduce(
          (sum, court) => sum + court._count.waitingLists,
          0
        ),
        weeklyReservations,
        monthlyReservations,
        sportsOffered: Object.keys(sportStats),
        sportStats,
        overallPriceRange: center.courts.length > 0 ? {
          min: Math.min(...center.courts.map(court => court.hourlyRate)),
          max: Math.max(...center.courts.map(court => court.hourlyRate)),
        } : { min: 0, max: 0 },
      },
      courts: center.courts.map(court => ({
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
        upcomingReservations: court.reservations,
        maintenanceSchedules: court.maintenanceSchedules,
        pricingRules: court.pricingRules,
        stats: {
          activeReservations: court._count.reservations,
          waitingListEntries: court._count.waitingLists,
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
      })),
      operatingHours: {
        isCurrentlyOpen: (() => {
          // Verificar si el centro está abierto actualmente
          // Esto es una implementación básica, se puede mejorar
          const currentHour = now.getHours();
          return currentHour >= 6 && currentHour < 23; // Asumiendo 6:00 - 23:00
        })(),
        nextOpeningTime: null, // Se puede calcular basado en openingHours
        nextClosingTime: null, // Se puede calcular basado en openingHours
      },
      createdAt: center.createdAt,
      updatedAt: center.updatedAt,
    };
    
    return NextResponse.json({ center: formattedCenter });
  } catch (error) {
    console.error('Error obteniendo centro:', error);
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}