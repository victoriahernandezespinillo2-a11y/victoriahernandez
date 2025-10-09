/**
 * GET /api/courts/[id]/calendar-status
 * Obtiene el estado completo del calendario para una cancha
 * Incluye disponibilidad, mantenimiento, reservas del usuario y conflictos
 */

import { NextRequest, NextResponse } from 'next/server';
import { zonedTimeToUtc, utcToZonedTime, formatInTimeZone } from 'date-fns-tz';
import { db } from '@repo/db';
import { withAuthMiddleware, ApiResponse } from '@/lib/middleware';
import { ScheduleCompatibilityService } from '@/lib/services/schedule-compatibility.service';

// Forzar renderizado dinámico para deshabilitar el cacheo de esta ruta
export const dynamic = 'force-dynamic';

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
  return withAuthMiddleware(async (req) => {
    try {
      console.log('🔍 [CALENDAR-STATUS] Iniciando endpoint...');
      // Usuario autenticado inyectado por el middleware
      const user = (req as any).user as { id: string; email?: string; name?: string };
      
      const pathSegments = req.nextUrl.pathname.split('/');
      const courtId = pathSegments[pathSegments.length - 2];
      const { searchParams } = new URL(req.url);
      const date = searchParams.get('date');
      const duration = parseInt(searchParams.get('duration') || '60');
      
      console.log('🔍 [CALENDAR-STATUS] Parámetros:', { courtId, date, duration });
      
      // Verificar que courtId existe
      if (!courtId) {
        console.error('❌ [CALENDAR-STATUS] courtId no encontrado');
        return ApiResponse.badRequest('ID de cancha requerido');
      }

      // 🔍 LOGGING PARA DEBUGGING DE AUTENTICACIÓN
      console.log(`🔍 [CALENDAR-AUTH] Usuario autenticado:`, {
        userId: user.id,
        email: user.email,
        name: user.name || '',
        timestamp: new Date().toISOString()
      });

      if (!date) {
        return ApiResponse.badRequest('Fecha requerida');
      }

      // 1. Definir la zona horaria del centro como la fuente de verdad.
      const centerTz = 'Europe/Madrid';

      // 2. Simplificar construcción de fechas
      const startOfDay = new Date(`${date}T00:00:00`);
      const endOfDay = new Date(`${date}T23:59:59`);
      const targetDate = startOfDay;

      // 🔍 LOGGING PARA DEBUGGING DE FECHAS (AHORA ZONIFICADO)
      console.log(`🔍 [CALENDAR-DATES] Fechas calculadas para zona horaria ${centerTz}:`, {
        inputDate: date,
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
      timestamp: new Date().toISOString()
    });

    console.log(`🔍 [CALENDAR-STATUS] Antes de consultar reservas...`);
    
    // 🔍 OBTENER DATOS COMPLETOS DEL CALENDARIO
    // 1) Reservas del día
    const reservations = await db.reservation.findMany({
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
      });

    // 2) Horarios de mantenimiento (con fallback robusto si Prisma falla)
    let maintenanceSchedules: any[] = [];
    try {
      maintenanceSchedules = await db.maintenanceSchedule.findMany({
        where: {
          courtId,
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          OR: [
            { scheduledAt: { gte: startOfDay, lte: endOfDay } },
            { AND: [{ startedAt: { not: null } }, { startedAt: { lte: endOfDay } }, { completedAt: { gte: startOfDay } }] },
            { AND: [{ completedAt: { not: null } }, { completedAt: { gte: startOfDay, lte: endOfDay } }] }
          ]
        },
        select: {
          id: true,
          scheduledAt: true,
          completedAt: true,
          type: true,
          description: true,
          estimatedDuration: true,
          activityType: true,
          activityCategory: true
        }
      });
    } catch (primaryErr) {
      console.warn('⚠️ [CALENDAR-STATUS] Fallback maint query por error:', primaryErr);
      // Fallback: traer mantenimientos del periodo amplio y filtrar en memoria
      maintenanceSchedules = await db.maintenanceSchedule.findMany({
        where: {
          courtId,
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          scheduledAt: { lte: endOfDay }
        },
        select: {
          id: true,
          scheduledAt: true,
          completedAt: true,
          type: true,
          description: true,
          estimatedDuration: true,
          activityType: true,
          activityCategory: true
        }
      });
    }

    // 3) Información de la cancha
    const court = await db.court.findUnique({
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
      });

    // 4) Reservas del usuario ese día (todas canchas) 
    const userReservations = await db.reservation.findMany({
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
      });

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

    // Log de mantenimiento para diagnóstico
    try {
      console.log('🧩 [CALENDAR] Maint count:', maintenanceSchedules.length, 'courtId:', courtId, 'date:', date);
      if (maintenanceSchedules.length > 0) {
        console.log('🧩 [CALENDAR] Maint sample:', maintenanceSchedules.slice(0, 5).map((m: any) => ({ id: m.id, at: m.scheduledAt, est: m.estimatedDuration, status: m.status })));
      }
    } catch {}

    // 🎨 GENERAR ESTADOS DEL CALENDARIO
    const calendarSlots = [] as any[];
    const slotMinutes = 30; // Intervalo de 30 minutos
    
    // 🕒 OBTENER HORARIOS DE OPERACIÓN DEL CENTRO (ENTERPRISE COMPATIBILITY)
    const centerSettings = court?.center?.settings as any || {};
    const weekday = targetDate.getDay(); // Usar directamente el día de la fecha objetivo
    
    // 🚀 NUEVA LÓGICA: Usar servicio de compatibilidad enterprise
    console.log(`🔍 [CALENDAR-STATUS] Llamando ScheduleCompatibilityService.getDaySchedule con:`, {
      centerSettings: JSON.stringify(centerSettings, null, 2),
      weekday,
      dayName: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][weekday]
    });
    
    const daySlots = ScheduleCompatibilityService.getDaySchedule(centerSettings, weekday);
    console.log(`🔍 [CALENDAR-STATUS] daySlots obtenidos:`, daySlots);
    
    if (daySlots.length === 0) {
      // Centro cerrado este día - no generar slots
      console.log(`📅 [CALENDAR-ENTERPRISE] Centro cerrado el día ${weekday}`);
      return NextResponse.json({
        courtId,
        date,
        duration,
        summary: { total: 0, available: 0, booked: 0, maintenance: 0, userBooked: 0, past: 0, unavailable: 0 },
        slots: [],
        legend: {}
      });
    }

    // 🎯 PROCESAR MÚLTIPLES FRANJAS HORARIAS
    const operatingRanges: Array<{ start: Date; end: Date }> = [];
    
    for (const slot of daySlots) {
      const startDateString = `${date}T${slot.start}:00`;
      const endDateString = `${date}T${slot.end}:00`;
      
      // CORREGIDO: Usar zonedTimeToUtc para interpretar correctamente en la zona del centro
      const slotStart = zonedTimeToUtc(startDateString, centerTz);
      const slotEnd = zonedTimeToUtc(endDateString, centerTz);
      
      operatingRanges.push({ start: slotStart, end: slotEnd });
      
      console.log(`🕒 [CALENDAR-ENTERPRISE] Franja horaria: ${slot.start}-${slot.end} (${slotStart.toISOString()} - ${slotEnd.toISOString()})`);
    }

    // ✅ Aplicar EXCEPCIONES por fecha (cerrado o rangos específicos)
    try {
      const exceptions = Array.isArray(centerSettings?.exceptions) ? centerSettings.exceptions : [];
      if (exceptions.length > 0) {
        const localDate = utcToZonedTime(targetDate, centerTz);
        const ymd = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
        const ex = exceptions.find((e: any) => e?.date === ymd);
        if (ex) {
          if (ex.closed === true) {
            // Centro cerrado: devolver sin slots
            return NextResponse.json({
              courtId,
              date,
              duration,
              summary: { total: 0, available: 0, booked: 0, maintenance: 0, userBooked: 0, past: 0, unavailable: 0 },
              slots: [],
              legend: {}
            });
          }
          if (Array.isArray(ex.ranges) && ex.ranges.length > 0) {
            // Construir slots solo dentro de los rangos excepcionales
            const ranges: Array<{ start: Date; end: Date }> = (ex.ranges as Array<{ start: string; end: string }>)
              .filter((r) => typeof r?.start === 'string' && typeof r?.end === 'string')
              .map((r) => ({
                start: zonedTimeToUtc(`${date}T${normalizeToHHmm(r.start)}:00`, centerTz),
                end: zonedTimeToUtc(`${date}T${normalizeToHHmm(r.end)}:00`, centerTz),
              }))
              .filter((r) => r.end > r.start);

            // Reemplazar ventana operativa por la unión mínima que cubra rangos de excepción
            if (ranges.length > 0) {
              // Para simplificar: generaremos slots luego iterando rangos en lugar de un único while
              // Devolvemos señal al bucle principal usando una variable local
              (globalThis as any).__calendar_exception_ranges = ranges;
            }
          }
        }
      }
    } catch {}

    // Si hay rangos excepcionales, generamos para cada rango; de lo contrario usamos [operatingStart, operatingEnd)
    const exceptionRanges: Array<{ start: Date; end: Date }> = (globalThis as any).__calendar_exception_ranges || [];
    const buildSlotsForRange = (rangeStart: Date, rangeEnd: Date) => {
      let currentTime = rangeStart.getTime();
      const endTime = rangeEnd.getTime();
      while (currentTime < endTime) {
        const slotStart = new Date(currentTime);
        const slotEnd = new Date(currentTime + duration * 60000);
        if (slotEnd.getTime() > endTime) break;
        // Representaciones en hora local del centro para mostrar al usuario
        const slotStartLocal = utcToZonedTime(slotStart, centerTz);
        const slotEndLocal   = utcToZonedTime(slotEnd, centerTz);
        const slotStartCompare = slotStart;
        const slotEndCompare   = slotEnd;
        let slotStatus = 'AVAILABLE';
        let slotColor = '#10b981';
        let slotMessage = 'Disponible';
        let conflicts: any[] = [];
        if (!court?.isActive) {
          slotStatus = 'UNAVAILABLE';
          slotColor = '#dc2626';
          slotMessage = 'Cancha inactiva';
        } else {
          const userConflict = userReservations.find((r: any) => slotStartCompare < r.endTime && slotEndCompare > r.startTime);
          if (userConflict) {
            slotStatus = 'USER_BOOKED';
            slotColor = '#6366f1';
            slotMessage = `Ya tienes una reserva a esta hora en la cancha ${userConflict.court.name}`;
            conflicts.push({ type: 'user_reservation', id: userConflict.id, court: userConflict.court.name, start: userConflict.startTime, end: userConflict.endTime, status: userConflict.status });
          } else {
            const maintenanceConflict = maintenanceSchedules.find((m: any) => {
              const maintenanceStart = m.scheduledAt;
              const durationMinutes = m.estimatedDuration || 120;
              const maintenanceEnd = m.completedAt || new Date(maintenanceStart.getTime() + durationMinutes * 60 * 1000);
              return slotStart < maintenanceEnd && slotEnd > maintenanceStart;
            });
            if (maintenanceConflict) {
              slotStatus = 'MAINTENANCE';
              slotColor = '#f59e0b';
              const activityMap: Record<string, string> = {
                TRAINING: 'Entrenamiento',
                CLASS: 'Clase',
                WARMUP: 'Calentamiento',
                EVENT: 'Evento',
                MEETING: 'Reunión',
                OTHER: 'Actividad',
                MAINTENANCE: 'Mantenimiento'
              };
              const maintMap: Record<string, string> = {
                CLEANING: 'Limpieza',
                REPAIR: 'Reparación',
                INSPECTION: 'Inspección',
                RENOVATION: 'Renovación'
              } as const;
              const actType = (maintenanceConflict as any).activityType as string | undefined;
              const maintType = (maintenanceConflict as any).type as string | undefined;
              const baseLabel = actType ? (activityMap[actType] || 'Actividad') : 'Mantenimiento';
              const detail = baseLabel === 'Mantenimiento' && maintType ? (maintMap[maintType] || maintType) : undefined;
              slotMessage = detail ? `${baseLabel}: ${detail}` : baseLabel;
              conflicts.push({ type: 'maintenance', activityType: actType || 'MAINTENANCE', description: maintenanceConflict.description, start: maintenanceConflict.scheduledAt, end: maintenanceConflict.completedAt });
            } else {
              const reservationConflict = reservations.find((r: any) => slotStartCompare < r.endTime && slotEndCompare > r.startTime);
              if (reservationConflict) {
                slotStatus = 'BOOKED';
                slotColor = '#ef4444';
                slotMessage = 'Reservado';
                conflicts.push({ type: 'reservation', id: reservationConflict.id, start: reservationConflict.startTime, end: reservationConflict.endTime, status: reservationConflict.status });
              } else {
                const nowUtc = new Date();
                if (slotEndCompare <= nowUtc) {
                  slotStatus = 'PAST';
                  slotColor = '#9ca3af';
                  slotMessage = 'Hora pasada';
                }
              }
            }
          }
        }
        calendarSlots.push({ startTime: formatInTimeZone(slotStart, centerTz, 'HH:mm'), endTime: formatInTimeZone(slotEnd, centerTz, 'HH:mm'), status: slotStatus, message: slotMessage, color: slotColor, available: slotStatus === 'AVAILABLE', conflicts });
        currentTime += slotMinutes * 60000;
      }
    };

    // 🚀 ENTERPRISE: Manejar múltiples franjas horarias
    if (exceptionRanges.length > 0) {
      // Excepciones tienen prioridad sobre horarios regulares
      exceptionRanges.forEach(r => buildSlotsForRange(r.start, r.end));
      // Limpiar señal global
      (globalThis as any).__calendar_exception_ranges = undefined;
      console.log(`🎯 [CALENDAR-ENTERPRISE] Generados slots para ${exceptionRanges.length} franjas excepcionales`);
    } else if (operatingRanges.length > 0) {
      // Usar múltiples franjas horarias regulares
      operatingRanges.forEach(range => buildSlotsForRange(range.start, range.end));
      console.log(`🎯 [CALENDAR-ENTERPRISE] Generados slots para ${operatingRanges.length} franjas horarias`);
    } else {
      // Sin horarios configurados
      console.log(`⚠️ [CALENDAR-ENTERPRISE] Sin horarios configurados para este día`);
    }

    return ApiResponse.success({ courtId, date: targetDate.toISOString(), slots: calendarSlots });
  } catch (error) {
    console.error('❌ [CALENDAR-STATUS] Error:', error);
    return ApiResponse.internalError('Error obteniendo estado del calendario');
  }
  })(request);
}
