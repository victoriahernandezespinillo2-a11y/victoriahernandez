import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth';
import { reservationService } from '../../../../../lib/services/reservation.service';
import { db } from '@repo/db';
import { z } from 'zod';

// Esquema para consultar disponibilidad
const AvailabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha debe ser YYYY-MM-DD'),
  duration: z.string().transform(Number).optional().default('60'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora debe ser HH:MM').optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora debe ser HH:MM').optional(),
});

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/courts/[id]/availability
 * Obtener disponibilidad de una cancha específica
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

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validatedParams = AvailabilityQuerySchema.parse(queryParams);
    
    // Construir fecha
    const date = new Date(validatedParams.date);

    // Obtener horario por defecto del centro para ese día si no viene en query
    let startTime = validatedParams.startTime;
    let endTime = validatedParams.endTime;

    if (!startTime || !endTime) {
      const court = await db.court.findUnique({ where: { id: courtId }, select: { centerId: true } });
      if (court?.centerId) {
        const center = await db.center.findUnique({ where: { id: court.centerId }, select: { settings: true } });
        const settings: any = center?.settings || {};
        const oh = settings?.operatingHours;
        if (oh && typeof oh === 'object') {
          const weekday = date.getDay();
          const map: Record<number, string> = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
          const key = map[weekday];
          const config = (oh as any)[key];
          if (config?.closed === true) {
            // Centro cerrado ese día
            return NextResponse.json({
              courtId,
              date: validatedParams.date,
              duration: validatedParams.duration,
              timeRange: { start: null, end: null },
              availability: { totalSlots: 0, availableSlots: 0, occupiedSlots: 0 },
              slots: [],
              reservations: [],
              maintenanceSchedules: [],
            });
          }
          if (!startTime && config?.open) startTime = config.open;
          if (!endTime && config?.close) endTime = config.close;
        }
      }
      // fallback final si no hubo configuración
      if (!startTime) startTime = '06:00';
      if (!endTime) endTime = '23:00';
    }
    
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startDateTime = new Date(date);
    startDateTime.setHours(startHour, startMinute, 0, 0);
    
    const endDateTime = new Date(date);
    endDateTime.setHours(endHour, endMinute, 0, 0);
    
    // Obtener disponibilidad base del día (slots de 30 min)
    const baseAvailability = await reservationService.getCourtAvailability(
      courtId,
      date
    );

    const baseSlots = baseAvailability.slots;

    // Determinar el tamaño de paso (minutos) a partir de los baseSlots
    let stepMinutes = 30;
    try {
      const sorted = [...baseSlots].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      if (sorted.length >= 2) {
        const diffMs = new Date(sorted[1].start).getTime() - new Date(sorted[0].start).getTime();
        const inferred = Math.max(1, Math.round(diffMs / 60000));
        if (Number.isFinite(inferred)) stepMinutes = inferred;
      }
    } catch {}

    // Generar slots disponibles basados en la duración solicitada
    const duration = validatedParams.duration;
    const availableSlots: Array<{ startTime: string; endTime: string; duration: number; available: boolean; timeSlot: string }> = [];

    // Crear slots cada stepMinutes dentro del rango horario
    let currentTime = new Date(startDateTime);
    while (currentTime < endDateTime) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60000);
      if (slotEnd <= endDateTime) {
        // Verificar que todos los sub-slots dentro del rango [currentTime, slotEnd) están disponibles
        let ok = true;
        let probe = new Date(currentTime);
        while (probe < slotEnd) {
          const subSlot = baseSlots.find(s => new Date(s.start).getTime() === probe.getTime());
          if (!subSlot || !subSlot.available) {
            ok = false;
            break;
          }
          // avanzar stepMinutes
          probe = new Date(probe.getTime() + stepMinutes * 60000);
        }

        availableSlots.push({
          startTime: currentTime.toISOString(),
          endTime: slotEnd.toISOString(),
          duration,
          available: ok,
          timeSlot: `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')} - ${slotEnd.getHours().toString().padStart(2, '0')}:${slotEnd.getMinutes().toString().padStart(2, '0')}`,
        });
      }
      currentTime = new Date(currentTime.getTime() + stepMinutes * 60000);
    }
    
    return NextResponse.json({
      courtId,
      date: validatedParams.date,
      duration,
      timeRange: {
        start: startTime,
        end: endTime,
      },
      availability: {
        totalSlots: availableSlots.length,
        availableSlots: availableSlots.filter(slot => slot.available).length,
        occupiedSlots: availableSlots.filter(slot => !slot.available).length,
      },
      slots: availableSlots,
      reservations: [],
      maintenanceSchedules: [],
    });
  } catch (error) {
    console.error('Error obteniendo disponibilidad:', error);
    
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

/**
 * POST /api/courts/[id]/availability
 * Verificar disponibilidad para una reserva específica
 */
export async function POST(
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

    const body = await request.json();
    
    const CheckAvailabilitySchema = z.object({
      startTime: z.string().datetime(),
      duration: z.number().min(30).max(480),
      excludeReservationId: z.string().cuid().optional(),
    });
    
    const validatedData = CheckAvailabilitySchema.parse(body);
    
    const isAvailable = await reservationService.checkAvailability(
      courtId,
      new Date(validatedData.startTime),
      validatedData.duration,
      validatedData.excludeReservationId
    );
    
    const endTime = new Date(
      new Date(validatedData.startTime).getTime() + 
      validatedData.duration * 60000
    );
    
    return NextResponse.json({
      available: isAvailable,
      courtId,
      requestedSlot: {
        startTime: validatedData.startTime,
        endTime: endTime.toISOString(),
        duration: validatedData.duration,
      },
      message: isAvailable 
        ? 'Horario disponible' 
        : 'Horario no disponible - existe conflicto con otra reserva o mantenimiento',
    });
  } catch (error) {
    console.error('Error verificando disponibilidad:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}