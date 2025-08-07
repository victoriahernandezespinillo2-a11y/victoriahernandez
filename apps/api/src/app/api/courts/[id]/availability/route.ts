import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth';
import { reservationService } from '../../../../../lib/services/reservation.service';
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
    
    // Construir fecha y hora de inicio y fin
    const date = new Date(validatedParams.date);
    
    // Si no se especifica hora de inicio, usar horario de apertura (06:00)
    const startTime = validatedParams.startTime || '06:00';
    const endTime = validatedParams.endTime || '23:00';
    
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startDateTime = new Date(date);
    startDateTime.setHours(startHour, startMinute, 0, 0);
    
    const endDateTime = new Date(date);
    endDateTime.setHours(endHour, endMinute, 0, 0);
    
    // Obtener disponibilidad de la cancha
    const availability = await reservationService.getCourtAvailability(
      courtId,
      startDateTime,
      endDateTime
    );
    
    // Generar slots disponibles basados en la duración solicitada
    const duration = validatedParams.duration;
    const availableSlots = [];
    
    // Crear slots cada 30 minutos dentro del rango horario
    let currentTime = new Date(startDateTime);
    
    while (currentTime < endDateTime) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60000);
      
      if (slotEnd <= endDateTime) {
        // Verificar si este slot está disponible
        const isAvailable = await reservationService.checkAvailability(
          courtId,
          currentTime,
          duration
        );
        
        availableSlots.push({
          startTime: currentTime.toISOString(),
          endTime: slotEnd.toISOString(),
          duration,
          available: isAvailable,
          timeSlot: `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')} - ${slotEnd.getHours().toString().padStart(2, '0')}:${slotEnd.getMinutes().toString().padStart(2, '0')}`,
        });
      }
      
      // Avanzar 30 minutos
      currentTime = new Date(currentTime.getTime() + 30 * 60000);
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
      reservations: availability.reservations.map(reservation => ({
        id: reservation.id,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        status: reservation.status,
        user: {
          name: reservation.user.name,
          email: reservation.user.email,
        },
      })),
      maintenanceSchedules: availability.maintenanceSchedules.map(maintenance => ({
        id: maintenance.id,
        startTime: maintenance.startTime,
        endTime: maintenance.endTime,
        type: maintenance.type,
        description: maintenance.description,
      })),
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