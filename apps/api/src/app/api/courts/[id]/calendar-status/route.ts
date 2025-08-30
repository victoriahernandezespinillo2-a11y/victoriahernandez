/**
 * GET /api/courts/[id]/calendar-status
 * Obtiene el estado completo del calendario para una cancha
 * Incluye disponibilidad, mantenimiento, reservas del usuario y conflictos
 */

import { NextRequest, NextResponse } from 'next/server';
import { zonedTimeToUtc, utcToZonedTime, formatInTimeZone } from 'date-fns-tz';
import { db } from '@repo/db';
import { withJwtAuth, JwtUser } from '@/lib/middleware/jwt-auth';

// Utilidad: normaliza '08:00 a.m.' | '10:00 p.m.' | '8:00 PM' -> 'HH:mm'
function normalizeToHHmm(input: string): string {
  if (!input) return '00:00';
  let s = input.trim().toLowerCase();
  s = s.replace(/\s+/g, ''); // quitar espacios
  // Reemplazar variantes a.m./p.m.
  s = s.replace(/a\.?m\.?/, 'am').replace(/p\.?m\.?/, 'pm');
  const m = s.match(/^(\d{1,2}):(\d{2})(am|pm)?$/);
  if (!m) {
    // si ya viene como HH:mm
    const hhmm = input.match(/^(\d{2}):(\d{2})$/);
    if (hhmm) return hhmm[0] || '00:00';
    return '00:00';
  }
  let hour = parseInt(m[1] || '0', 10);
  const minute = m[2] || '00';
  const mer = m[3];
  if (mer === 'am') {
    if (hour === 12) hour = 0;
  } else if (mer === 'pm') {
    if (hour !== 12) hour += 12;
  }
  const hh = hour.toString().padStart(2, '0');
  return `${hh}:${minute}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withJwtAuth(async (req, user: JwtUser) => {
    try {
      const pathSegments = request.nextUrl.pathname.split('/');
      const courtId = pathSegments[pathSegments.length - 2];
      const { searchParams } = new URL(request.url);
      const date = searchParams.get('date');
      const duration = parseInt(searchParams.get('duration') || '60');

      // 🔍 LOGGING PARA DEBUGGING DE AUTENTICACIÓN
      console.log(`🔍 [CALENDAR-AUTH] Usuario autenticado:`, {
        userId: user.id,
        email: user.email,
        name: user.name,
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
          userId: user.id,
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
      userReservationsDetails: userReservations.map((r: any) => ({
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
    
    // 🕒 OBTENER HORARIOS DE OPERACIÓN DEL CENTRO
    let operatingStart = new Date(startOfDay);
    let operatingEnd = new Date(endOfDay);
    // Determinar zona horaria del centro (default Europe/Madrid)
    let centerTz = 'Europe/Madrid';
    
    const centerSettings = court?.center?.settings as any || {};

    if (centerSettings) {
      const settings = centerSettings;
      // 🔧 BUSCAR EN AMBAS ESTRUCTURAS: operatingHours Y business_hours
      const operatingHours = settings.operatingHours || settings.business_hours;
      
      if (operatingHours && typeof operatingHours === 'object') {
        const weekday = targetDate.getDay();
        const dayMap: Record<number, string> = { 
          0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 
          4: 'thursday', 5: 'friday', 6: 'saturday' 
        };
        const dayKey = dayMap[weekday];
        const dayConfig = dayKey ? operatingHours[dayKey] : null;
        
        if (dayConfig?.closed) {
          // Centro cerrado este día - no generar slots
          console.log(`📅 [CALENDAR] Centro cerrado el ${dayKey}`);
          return NextResponse.json({
            courtId,
            date: date,
            duration,
            summary: { total: 0, available: 0, booked: 0, maintenance: 0, userBooked: 0, past: 0, unavailable: 0 },
            slots: [],
            legend: {}
          });
        }
        
        if (dayConfig?.open && dayConfig?.close) {
          const tzSetting = (centerSettings.timezone as string | undefined) ?? 'Europe/Madrid';
          centerTz = tzSetting;

          // Normalizar a HH:mm 24h
          const open24  = normalizeToHHmm(dayConfig.open);
          const close24 = normalizeToHHmm(dayConfig.close);

          // Convertir HH:mm locales a UTC utilizando la zona horaria del centro
          // Usar ISO completo para evitar ambigüedad al parsear (corrige desfase observado)
          operatingStart = zonedTimeToUtc(`${date}T${open24}:00`, centerTz);
          operatingEnd   = zonedTimeToUtc(`${date}T${close24}:00`, centerTz);
          
          console.log(`🕒 [CALENDAR] Horarios de operación para ${dayKey}:`, {
            open: open24,
            close: close24,
            operatingStart: operatingStart.toISOString(),
            operatingEnd: operatingEnd.toISOString(),
            timezone: centerTz,
            currentServerTime: new Date().toISOString()
          });
        }
      }
    }

    const currentTime = new Date(operatingStart);

    while (currentTime < operatingEnd) {
      const slotStart = new Date(currentTime);
      const slotEnd = new Date(currentTime.getTime() + duration * 60000);

      // Representaciones en hora local del centro para mostrar al usuario
      const slotStartLocal = utcToZonedTime(slotStart, centerTz);
      const slotEndLocal   = utcToZonedTime(slotEnd, centerTz);
      
      // 🕐 CONVERTIR SLOTS A HORA DE MADRID PARA COMPARACIONES
      const slotStartCompare = slotStart; // ya en UTC
      const slotEndCompare   = slotEnd;
      
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
        const maintenanceConflict = maintenanceSchedules.find((m: any) => {
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
            const reservationConflict = reservations.find((r: any) => {
              return slotStartCompare < r.endTime && slotEndCompare > r.startTime;
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
              const userConflict = userReservations.find((r: any) => {
                return slotStartCompare < r.endTime && slotEndCompare > r.startTime;
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
                // Si la hora ya pasó (en hora de Madrid/España)
                const nowUtc = new Date(); // comparar en UTC, slotEndCompare ya está en UTC
                if (slotEndCompare <= nowUtc) {
                  slotStatus = 'PAST';
                  slotColor = '#9ca3af'; // Gris para pasado
                  slotMessage = 'Hora pasada';
                }
              }
            }
          }
      }

      calendarSlots.push({
        startTime: formatInTimeZone(slotStartLocal, centerTz, 'HH:mm'),
        endTime: formatInTimeZone(slotEndLocal,   centerTz, 'HH:mm'),
        status: slotStatus,
        message: slotMessage,
        color: slotColor,
        available: slotStatus === 'AVAILABLE',
        conflicts,
      });

      currentTime.setMinutes(currentTime.getMinutes() + slotMinutes);
    }

    return NextResponse.json({
      courtId,
      date: targetDate.toISOString(),
      slots: calendarSlots
    });
    } catch (error) {
      console.error('❌ [CALENDAR-STATUS] Error:', error);
      return NextResponse.json(
        { error: 'Error obteniendo estado del calendario' },
        { status: 500 }
      );
    }
  })(request);
}
