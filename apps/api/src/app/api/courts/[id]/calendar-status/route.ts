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
import {
  resolveMaxAdvanceDays,
  validateWithinAdvanceWindow,
} from '@/lib/utils/booking-settings';

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
      const requestedSport = searchParams.get('sport');

      console.log('🔍 [CALENDAR-STATUS] Parámetros recibidos:', {
        courtId,
        date,
        duration,
        requestedSport,
        queryStringComplete: req.url
      });
      console.log('🔍 [CALENDAR-STATUS] SearchParams completos:', Object.fromEntries(searchParams.entries()));

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

      const court = await db.court.findUnique({
        where: { id: courtId },
        select: {
          id: true,
          isActive: true,
          maintenanceStatus: true,
          isMultiuse: true,
          primarySport: true,
          allowedSports: true,
          center: {
            select: {
              settings: true,
              timezone: true,
            },
          },
        },
      });

      if (!court) {
        return ApiResponse.notFound('Cancha no encontrada');
      }

      const centerSettings = (court.center?.settings as any) || {};
      const centerTz = court.center?.timezone || centerSettings?.general?.timezone || 'Europe/Madrid';
      const maxAdvanceDays = resolveMaxAdvanceDays(centerSettings);

      const targetDate = new Date(`${date}T00:00:00`);
      const now = new Date();

      if (!validateWithinAdvanceWindow(targetDate, now, maxAdvanceDays)) {
        return ApiResponse.badRequest(`Las reservas solo pueden consultarse hasta ${maxAdvanceDays} días de antelación`);
      }

      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

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
          userId: true,
          sport: true // Necesario para lógica multiuso
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

      // ✅ PASO 1: Obtener rol del usuario para admin maintenance override
      const userWithRole = await db.user.findUnique({
        where: { id: user.id },
        select: { role: true, email: true }
      });
      const userRole = userWithRole?.role || 'USER';

      console.log('👤 [CALENDAR-ROLE] Usuario detectado:', {
        userId: user.id,
        email: userWithRole?.email,
        role: userRole,
        isAdmin: userRole === 'ADMIN'
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
      } catch { }

      // 🎨 GENERAR ESTADOS DEL CALENDARIO
      const calendarSlots = [] as any[];
      const slotMinutes = 30; // Intervalo de 30 minutos

      // 🕒 OBTENER HORARIOS DE OPERACIÓN DEL CENTRO (ENTERPRISE COMPATIBILITY)
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
        return ApiResponse.success({
          courtId,
          date,
          duration,
          summary: { total: 0, available: 0, booked: 0, maintenance: 0, userBooked: 0, past: 0, unavailable: 0 },
          slots: [],
          legend: {},
          limits: { maxAdvanceDays },
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
              return ApiResponse.success({
                courtId,
                date,
                duration,
                summary: { total: 0, available: 0, booked: 0, maintenance: 0, userBooked: 0, past: 0, unavailable: 0 },
                slots: [],
                legend: {},
                limits: { maxAdvanceDays },
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
      } catch { }

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
          const slotEndLocal = utcToZonedTime(slotEnd, centerTz);
          const slotStartCompare = slotStart;
          const slotEndCompare = slotEnd;
          let slotStatus = 'AVAILABLE';
          let slotColor = '#10b981';
          let slotMessage = 'Disponible';
          let conflicts: any[] = [];
          if (!court?.isActive) {
            slotStatus = 'UNAVAILABLE';
            slotColor = '#dc2626';
            slotMessage = 'Cancha inactiva';
          } else {
            const userConflict = userReservations.find((r: any) =>
              r.courtId === courtId && // ⚠️ CRITICAL: Solo marcar como USER_BOOKED si es la MISMA cancha
              slotStartCompare < r.endTime &&
              slotEndCompare > r.startTime
            );
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
                // ✅ ADMIN OVERRIDE: Distinguir entre ADMIN y USER
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

                if (userRole === 'ADMIN') {
                  // ✅ ADMIN: Puede ver y reservar (con aviso visual)
                  slotStatus = 'MAINTENANCE_OVERRIDE';
                  slotColor = '#f59e0b'; // Ámbar/Naranja
                  slotMessage = `⚙️ ${detail ? `${baseLabel}: ${detail}` : baseLabel} - Disponible para Admin`;
                  console.log('🔧 [ADMIN-MAINTENANCE] Slot disponible para admin:', {
                    slotTime: slotStartLocal.toISOString(),
                    maintenanceType: actType || maintType,
                    userEmail: userWithRole?.email
                  });
                } else {
                  // ❌ USER: Bloqueado (SIN CAMBIOS del comportamiento actual)
                  slotStatus = 'MAINTENANCE';
                  slotColor = '#6b7280'; // Gris
                  slotMessage = detail ? `${baseLabel}: ${detail}` : baseLabel;
                }

                conflicts.push({ type: 'maintenance', activityType: actType || 'MAINTENANCE', description: maintenanceConflict.description, start: maintenanceConflict.scheduledAt, end: maintenanceConflict.completedAt });
              } else {
                // 🚀 LÓGICA DE BLOQUEO MULTI-USO
                const normalize = (s: string | null | undefined) => (s || '').toUpperCase().trim();
                const primarySport = normalize(court.primarySport);
                const newSport = normalize(requestedSport);
                const allowedSports = Array.isArray(court.allowedSports) ? court.allowedSports.map((s: string) => normalize(s)) : [];

                // Filtrar reservas que se solapan con este slot
                const overlappingReservations = reservations.filter((r: any) => slotStartCompare < r.endTime && slotEndCompare > r.startTime);

                if (overlappingReservations.length > 0) {
                  let isBlocked = true; // Por defecto bloqueado si hay reserva

                  if (court.isMultiuse && requestedSport) {
                    console.log(`🧩 [MULTIUSE-DEBUG] Checking slot ${slotStartLocal.toISOString()}`);
                    console.log(`   - Primary: ${primarySport}`);
                    console.log(`   - Requested: ${newSport}`);
                    console.log(`   - Allowed: ${JSON.stringify(allowedSports)}`);
                    console.log(`   - Overlapping: ${overlappingReservations.length}`);

                    // Aplicar lógica multiuso solo si es cancha multiuso y se especificó deporte

                    // Si la nueva reserva es del deporte principal, se bloquea con CUALQUIER reserva existente
                    if (newSport === primarySport) {
                      console.log('   ❌ Blocking: Requested is PRIMARY');
                      isBlocked = true;
                    }
                    // Si la nueva reserva es deporte secundario
                    else if (newSport !== primarySport && allowedSports.includes(newSport)) {
                      // Verificar si alguna reserva existente es BLOQUEANTE
                      // Bloqueante = Deporte Principal
                      const hasBlockingReservation = overlappingReservations.some((r: any) => {
                        const rSport = normalize(r.sport);
                        console.log(`   - Existing reservation sport: ${rSport}`);
                        // Si la reserva existente es Principal -> BLOQUEA
                        if (rSport === primarySport) return true;
                        // Si la reserva existente es Secundaria -> PERMITE (no bloquea)
                        return false;
                      });

                      if (hasBlockingReservation) {
                        console.log('   ❌ Blocking: Found PRIMARY reservation');
                      } else {
                        console.log('   ✅ ALLOWING: Only secondary reservations found');
                      }
                      isBlocked = hasBlockingReservation;
                    } else {
                      console.log('   ❌ Blocking: Requested sport not in allowed list or unknown case');
                    }
                  }

                  if (isBlocked) {
                    slotStatus = 'BOOKED';
                    slotColor = '#ef4444';
                    slotMessage = 'Reservado';
                    const r = overlappingReservations[0]; // Tomar el primero para info
                    if (r) {
                      conflicts.push({ type: 'reservation', id: r.id, start: r.startTime, end: r.endTime, status: r.status });
                    }
                  }
                } else {
                  // No hay reservas solapadas, verificar pasado
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

      const normalizedSummary = {
        total: calendarSlots.length,
        available: calendarSlots.filter((slot) => slot.status === 'AVAILABLE').length,
        booked: calendarSlots.filter((slot) => slot.status === 'BOOKED').length,
        maintenance: calendarSlots.filter((slot) => slot.status === 'MAINTENANCE').length,
        userBooked: calendarSlots.filter((slot) => slot.status === 'USER_BOOKED').length,
        past: calendarSlots.filter((slot) => slot.status === 'PAST').length,
        unavailable: calendarSlots.filter((slot) => slot.status === 'UNAVAILABLE').length,
      };

      const legend = {
        AVAILABLE: { color: '#10b981', label: 'Disponible' },
        BOOKED: { color: '#ef4444', label: 'Reservado' },
        MAINTENANCE: { color: '#f59e0b', label: 'Mantenimiento' },
        USER_BOOKED: { color: '#6366f1', label: 'Reserva del usuario' },
        PAST: { color: '#9ca3af', label: 'Horario pasado' },
        UNAVAILABLE: { color: '#dc2626', label: 'No disponible' },
      } as const;

      return ApiResponse.success({
        courtId,
        date: targetDate.toISOString(),
        duration,
        summary: normalizedSummary,
        slots: calendarSlots,
        legend,
        limits: { maxAdvanceDays },
      });
    } catch (error) {
      console.error('❌ [CALENDAR-STATUS] Error:', error);
      return ApiResponse.internalError('Error obteniendo estado del calendario');
    }
  })(request);
}
