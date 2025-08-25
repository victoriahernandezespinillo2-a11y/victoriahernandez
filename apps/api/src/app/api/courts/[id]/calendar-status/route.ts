/**
 * GET /api/courts/[id]/calendar-status
 * Obtiene el estado completo del calendario para una cancha
 * Incluye disponibilidad, mantenimiento, reservas del usuario y conflictos
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth';
import { db } from '@repo/db';
import { withReservationMiddleware, ApiResponse } from '@/lib/middleware';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withReservationMiddleware(async (request: NextRequest) => {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        );
      }

    const pathSegments = request.nextUrl.pathname.split('/');
    const courtId = pathSegments[pathSegments.length - 2];
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const duration = parseInt(searchParams.get('duration') || '60');

    // 🔍 LOGGING PARA DEBUGGING DE AUTENTICACIÓN
    console.log(`🔍 [CALENDAR-AUTH] Usuario autenticado:`, {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      timestamp: new Date().toISOString()
    });

    if (!date) {
      return NextResponse.json(
        { error: 'Fecha requerida' },
        { status: 400 }
      );
    }

    // 🕐 MANEJO MEJORADO DE FECHAS PARA EVITAR PROBLEMAS DE ZONA HORARIA
    const targetDate = new Date(date + 'T00:00:00.000Z');
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // 🔍 LOGGING PARA DEBUGGING DE FECHAS
    console.log(`🔍 [CALENDAR-DATES] Fechas calculadas:`, {
      inputDate: date,
      targetDate: targetDate.toISOString(),
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
      timestamp: new Date().toISOString()
    });

    // 🔍 OBTENER DATOS COMPLETOS DEL CALENDARIO
    const [reservations, maintenanceSchedules, court, userReservations] = await Promise.all([
      // 1. Reservas existentes en esta cancha
      db.reservation.findMany({
        where: {
          courtId,
          startTime: { gte: startOfDay, lte: endOfDay },
          status: { in: ['PENDING', 'PAID', 'IN_PROGRESS'] }
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
          userId: true
        }
      }),

      // 2. Horarios de mantenimiento
      db.maintenanceSchedule.findMany({
        where: {
          courtId,
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          OR: [
            { scheduledAt: { lte: endOfDay } },
            { completedAt: { gte: startOfDay } }
          ]
        },
        select: {
          id: true,
          scheduledAt: true,
          completedAt: true,
          type: true,
          description: true
        }
      }),

      // 3. Información de la cancha
      db.court.findUnique({
        where: { id: courtId },
        select: {
          id: true,
          name: true,
          isActive: true,
          maintenanceStatus: true,
          center: {
            select: {
              settings: true
            }
          }
        }
      }),

      // 4. 🚀 NUEVO: Reservas del usuario en TODAS las canchas para el mismo día
      db.reservation.findMany({
        where: {
          userId: session.user.id,
          startTime: { gte: startOfDay, lte: endOfDay },
          status: { in: ['PENDING', 'PAID', 'IN_PROGRESS'] }
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
          courtId: true,
          court: {
            select: {
              name: true
            }
          }
        }
      })
    ]);

    // 🔍 LOGGING PARA DEBUGGING DE RESERVAS
    console.log(`🔍 [CALENDAR-RESERVATIONS] Datos encontrados:`, {
      courtId,
      date: targetDate.toISOString(),
      reservationsInCourt: reservations.length,
      userReservationsTotal: userReservations.length,
      userReservationsDetails: userReservations.map(r => ({
        id: r.id,
        courtName: r.court.name,
        startTime: r.startTime,
        endTime: r.endTime,
        status: r.status
      })),
      timestamp: new Date().toISOString()
    });

    // 🎨 GENERAR ESTADOS DEL CALENDARIO
    const calendarSlots = [] as any[];
    const slotMinutes = 30; // Intervalo de 30 minutos
    const currentTime = new Date(startOfDay);

    while (currentTime < endOfDay) {
      const slotStart = new Date(currentTime);
      const slotEnd = new Date(currentTime.getTime() + duration * 60000);
      
      // 🔍 DETERMINAR ESTADO DEL SLOT
      let slotStatus = 'AVAILABLE';
      let slotColor = '#10b981'; // Verde por defecto
      let slotMessage = 'Disponible';
      let conflicts: any[] = [];

      // Verificar si la cancha está activa
      if (!court?.isActive) {
        slotStatus = 'UNAVAILABLE';
        slotColor = '#dc2626';
        slotMessage = 'Cancha inactiva';
      } else {
        // Verificar mantenimiento
        const maintenanceConflict = maintenanceSchedules.find(m => {
          const maintenanceStart = m.scheduledAt;
          const maintenanceEnd = m.completedAt || new Date(maintenanceStart.getTime() + 2 * 60 * 60000); // 2h por defecto
          return slotStart < maintenanceEnd && slotEnd > maintenanceStart;
        });

        if (maintenanceConflict) {
          slotStatus = 'MAINTENANCE';
          slotColor = '#f59e0b';
          slotMessage = `Mantenimiento: ${maintenanceConflict.type}`;
          conflicts.push({
            type: 'maintenance',
            description: maintenanceConflict.description,
            start: maintenanceConflict.scheduledAt,
            end: maintenanceConflict.completedAt
          });        } else {
            // Verificar reservas existentes en esta cancha
            const reservationConflict = reservations.find(r => {
              return slotStart < r.endTime && slotEnd > r.startTime;
            });

            if (reservationConflict) {
              // 🔍 LOGGING PARA DEBUGGING DE CONFLICTOS
              console.log(`🔍 [CALENDAR-CONFLICT] Conflicto encontrado:`, {
                slotTime: slotStart.toISOString(),
                conflictReservationId: reservationConflict.id,
                conflictStart: reservationConflict.startTime,
                conflictEnd: reservationConflict.endTime,
                conflictStatus: reservationConflict.status
              });

              slotStatus = 'BOOKED';
              slotColor = '#ef4444';
              slotMessage = 'Reservado';
              conflicts.push({
                type: 'reservation',
                id: reservationConflict.id,
                start: reservationConflict.startTime,
                end: reservationConflict.endTime,
                status: reservationConflict.status
              });
            } else {
              // Verificar si el usuario tiene reserva en otra cancha en el mismo horario
              const userConflict = userReservations.find(r => {
                return slotStart < r.endTime && slotEnd > r.startTime;
              });

              if (userConflict) {
                slotStatus = 'USER_BOOKED';
                slotColor = '#6366f1'; // Indigo para reservas del usuario
                slotMessage = `Ya tienes una reserva a esta hora en la cancha ${userConflict.court.name}`;
                conflicts.push({
                  type: 'user_reservation',
                  id: userConflict.id,
                  court: userConflict.court.name,
                  start: userConflict.startTime,
                  end: userConflict.endTime,
                  status: userConflict.status
                });
              } else {
                // Si la hora ya pasó
                if (slotEnd <= new Date()) {
                  slotStatus = 'PAST';
                  slotColor = '#9ca3af'; // Gris para pasado
                  slotMessage = 'Hora pasada';
                }
              }
            }
          }
      }

      calendarSlots.push({
        time: slotStart.toISOString(),
        startTime: slotStart.toTimeString().slice(0, 5), // HH:MM format
        endTime: slotEnd.toTimeString().slice(0, 5), // HH:MM format
        status: slotStatus,
        color: slotColor,
        message: slotMessage,
        conflicts,
        available: slotStatus === 'AVAILABLE'
      });

      currentTime.setMinutes(currentTime.getMinutes() + slotMinutes);
    }

    return ApiResponse.success({
      courtId,
      date: targetDate.toISOString(),
      slots: calendarSlots
    });
    } catch (error) {
      console.error('❌ [CALENDAR-STATUS] Error:', error);
      return ApiResponse.internalError('Error obteniendo estado del calendario');
    }
  })(request);
}
